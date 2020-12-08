using Signum.Engine;
using Signum.Engine.Authorization;
using Signum.Entities;
using Signum.Entities.Authorization;
using Signum.React.Filters;
using Signum.Utilities;
using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Text;
using System.Runtime.Serialization.Formatters.Binary;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Authorization;
using Signum.Engine.Json;
using System.Text.Json;

namespace Signum.React.Authorization
{
    public static class AuthTokenServer
    {
        public static Func<AuthTokenConfigurationEmbedded> Configuration;

        public static void Start(Func<AuthTokenConfigurationEmbedded> tokenConfig, string hashableEncryptionKey)
        {
            Configuration = tokenConfig;
            CryptoKey = new MD5CryptoServiceProvider().Using(p => p.ComputeHash(Encoding.UTF8.GetBytes(hashableEncryptionKey)));

            SignumAuthenticationFilter.Authenticators.Add(TokenAuthenticator);
            SignumAuthenticationFilter.Authenticators.Add(AnonymousUserAuthenticator);
            SignumAuthenticationFilter.Authenticators.Add(AllowAnonymousAuthenticator);
            SignumAuthenticationFilter.Authenticators.Add(InvalidAuthenticator);
        }

        public static SignumAuthenticationResult? InvalidAuthenticator(FilterContext actionContext)
        {
            throw new AuthenticationException("No authentication information found!");
        }

        public static SignumAuthenticationResult? AnonymousUserAuthenticator(FilterContext actionContext)
        {
            if (AuthLogic.AnonymousUser != null)
                return new SignumAuthenticationResult { User = AuthLogic.AnonymousUser };

            return null;
        }


        public static SignumAuthenticationResult? AllowAnonymousAuthenticator(FilterContext actionContext)
        {
            if (actionContext.ActionDescriptor is ControllerActionDescriptor cad && 
                (cad.MethodInfo.HasAttribute<SignumAllowAnonymousAttribute>() || cad.ControllerTypeInfo.HasAttribute<SignumAllowAnonymousAttribute>()))
                return new SignumAuthenticationResult();

            return null;
        }

        static SignumAuthenticationResult? TokenAuthenticator(FilterContext ctx)
        {
            var authHeader = ctx.HttpContext.Request.Headers["Authorization"].FirstOrDefault();
            if (authHeader == null)
            {
                return null;
            }

            var token = DeserializeAuthHeaderToken(authHeader);

            var c = Configuration();

            bool requiresRefresh = token.CreationDate.AddMinutes(c.RefreshTokenEvery) < TimeZoneManager.Now ||
                c.RefreshAnyTokenPreviousTo.HasValue && token.CreationDate < c.RefreshAnyTokenPreviousTo;

            if (requiresRefresh)
            {
                ctx.HttpContext.Response.Headers["New_Token"] = RefreshToken(token, out var newUser);
                return new SignumAuthenticationResult { User = token.User };
            }

            return new SignumAuthenticationResult { User = token.User };
        }

        public static string RefreshToken(AuthToken oldToken, out UserEntity newUser)
        {
            var user = AuthLogic.Disable().Using(_ => Database.Query<UserEntity>().SingleOrDefaultEx(u => u.Id == oldToken.User.Id));

            if (user == null)
                throw new AuthenticationException(LoginAuthMessage.TheUserIsNotLongerInTheDatabase.NiceToString());

            if (user.State == UserState.Disabled)
                throw new AuthenticationException(LoginAuthMessage.User0IsDisabled.NiceToString(user));

            if (user.UserName != oldToken.User.UserName)
                throw new AuthenticationException(LoginAuthMessage.InvalidUsername.NiceToString());

            if (!user.PasswordHash.EmptyIfNull().SequenceEqual(oldToken.User.PasswordHash.EmptyIfNull()))
                throw new AuthenticationException(LoginAuthMessage.InvalidPassword.NiceToString());

            AuthToken newToken = new AuthToken
            {
                User = user,
                CreationDate = TimeZoneManager.Now,
            };

            var result = SerializeToken(newToken);
            newUser = user;
            return result;
        }


        public static Func<string, AuthToken> DeserializeAuthHeaderToken = (string authHeader) => DeserializeToken(authHeader.After("Bearer "));

        public static AuthToken DeserializeToken(string token)
        {
            try
            {
                var array = Convert.FromBase64String(token);

                array = Decrypt(array);

                using (var ms = new MemoryStream(array))
                using (DeflateStream ds = new DeflateStream(ms, CompressionMode.Decompress))
                {
                    var bytes = ds.ReadAllBytes();
                    return JsonExtensions.FromJsonBytes<AuthToken>(bytes, EntityJsonContext.FullJsonSerializerOptions);
                }
            }
            catch (Exception)
            {
                throw new AuthenticationException("Invalid token");
            }
        }

        public static string CreateToken(UserEntity user)
        {
            AuthToken newToken = new AuthToken
            {
                User = user,
                CreationDate = TimeZoneManager.Now,
            };

            return SerializeToken(newToken);
        }

        static string SerializeToken(AuthToken token)
        {
            using (HeavyProfiler.LogNoStackTrace("SerializeToken"))
            {
                var array = new MemoryStream().Using(ms =>
                {
                    using (DeflateStream ds = new DeflateStream(ms, CompressionMode.Compress))
                    {
                        using (Utf8JsonWriter writer = new Utf8JsonWriter(ds))
                        {
                            JsonSerializer.Serialize(writer, token, EntityJsonContext.FullJsonSerializerOptions);
                        }
                    }

                    return ms.ToArray();
                });

                //var str = Encoding.UTF8.GetString(array);

                array = Encrypt(array);

                return Convert.ToBase64String(array);
            }
        }

        static byte[] CryptoKey;

        //http://stackoverflow.com/questions/8041451/good-aes-initialization-vector-practice
        static byte[] Encrypt(byte[] toEncryptBytes)
        {
            using (var provider = new AesCryptoServiceProvider())
            {
                provider.Key = CryptoKey;
                provider.Mode = CipherMode.CBC;
                provider.Padding = PaddingMode.PKCS7;
                using (var encryptor = provider.CreateEncryptor(provider.Key, provider.IV))
                {
                    using (var ms = new MemoryStream())
                    {
                        ms.Write(provider.IV, 0, provider.IV.Length);
                        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                        {
                            cs.Write(toEncryptBytes, 0, toEncryptBytes.Length);
                            cs.FlushFinalBlock();
                        }
                        return ms.ToArray();
                    }
                }
            }
        }

        static byte[] Decrypt(byte[] encryptedString)
        {
            using (var provider = new AesCryptoServiceProvider())
            {
                provider.Key = CryptoKey;
                using (var ms = new MemoryStream(encryptedString))
                {
                    // Read the first 16 bytes which is the IV.
                    byte[] iv = new byte[16];
                    ms.Read(iv, 0, 16);
                    provider.IV = iv;

                    using (var decryptor = provider.CreateDecryptor())
                    {
                        using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read))
                        {
                            return cs.ReadAllBytes();
                        }
                    }
                }
            }
        }

    }

    [Serializable]
    public class AuthToken
    {
        public UserEntity User { get; set; }

        public DateTime CreationDate { get; set; }
    }

    [Serializable]
    public class NewTokenRequiredException : Exception
    {
        public NewTokenRequiredException(string message) : base(message) { }
    }
}
