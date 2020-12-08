using System;
using System.Collections.Generic;
using System.Linq;
using Signum.Entities.Authorization;
using System.Reflection;
using Signum.Engine.DynamicQuery;
using Signum.Engine.Maps;
using Signum.Entities;
using Signum.Engine.Mailing;
using Signum.Utilities;
using Signum.Entities.Mailing;
using Signum.Engine.Basics;
using Signum.Engine.Operations;
using Signum.Services;
using Signum.Entities.Basics;

namespace Signum.Engine.Authorization
{
    public static class ResetPasswordRequestLogic
    {
        public static Func<string, UserEntity?>? ValidateEmail;
        public static Func<string, UserEntity, string?>? ValidateSubCode;
        public static Func<string, UserEntity, string>? ChangePasswordForcedHandler;

        /// <summary>
        /// Parameteres: Email to sent, password generated, RPR to make the email
        /// </summary>
        public static Action<string?, string, string, ResetPasswordRequestEntity>? EmailPreChangeHandler;

        /// <summary>
        /// Parameters: UserEntity, OldPass, NewPass
        /// </summary>
        public static Action<UserEntity, string, string>? ChangePasswordImpersonateHandler;

        public static void Start(SchemaBuilder sb)
        {
            if (sb.NotDefined(MethodInfo.GetCurrentMethod()))
            {
                sb.Include<ResetPasswordRequestEntity>()
                    .WithQuery(() => e => new
                    {
                        Entity = e,
                        e.Id,
                        e.RequestDate,
                        e.Code,
                        e.User,
                        e.User.Email
                    });

                EmailLogic.AssertStarted(sb);

                EmailModelLogic.RegisterEmailModel<ResetPasswordRequestEmail>(null);

                ///Disabled default template because i want to create it from web app
                /*() => new EmailTemplateEntity
                {
                    DisableAuthorization = true,
                    Messages = CultureInfoLogic.ForEachCulture(culture => new EmailTemplateMessageEmbedded(culture)
                    {
                        Text = "<p>{0}</p>".FormatWith(AuthEmailMessage.YouRecentlyRequestedANewPassword.NiceToString()) +
                            "<p>{0} @[User.UserName]</p>".FormatWith(AuthEmailMessage.YourUsernameIs.NiceToString()) +
                            "<p>{0}</p>".FormatWith(AuthEmailMessage.YouCanResetYourPasswordByFollowingTheLinkBelow.NiceToString()) +
                            "<p><a href=\"@[m:Url]\">@[m:Url]</a></p>",
                        Subject = AuthEmailMessage.ResetPasswordRequestSubject.NiceToString()
                    }).ToMList()
                });*/

                new Graph<ResetPasswordRequestEntity>.Execute(ResetPasswordRequestOperation.Execute)
                {
                    CanBeNew = false,
                    CanBeModified = false,
                    CanExecute = (e) => e.Lapsed == false ? null : AuthEmailMessage.YourResetPasswordRequestHasExpired.NiceToString(),
                    Execute = (e, args) =>
                    {
                        string password = args.GetArg<string>();
                        e.Lapsed = true;
                        e.Executed = true;
                        var user = e.User;

                        var error = UserEntity.OnValidatePassword(password);
                        if (error != null)
                            throw new ApplicationException(error);

                        user.PasswordHash = Security.EncodePassword(password);
                        using (AuthLogic.Disable())
                            user.Execute(UserOperation.Save);
                    }
                }.Register();

            }
        }


        public static ResetPasswordRequestEntity ResetPasswordRequestExecute(string subCode, string code, string password)
        {
            using (AuthLogic.Disable())
            {

                var user = Database.Query<ResetPasswordRequestEntity>().Where(el => el.Code == code).Select(el => el.User).Single();
                
                //Checking the last request if have 24h between the new request
                if (Database.Query<ResetPasswordRequestEntity>()
                     .Any(r => r.User.Is(user) && r.RequestDate > DateTime.Now.AddHours(-24) && r.Code != code && r.Executed))
                    throw new InvalidOperationException(AuthEmailMessage.NotHave24HoursBetweenRequests.NiceToString());

                //Remove old previous requests
                var rpr = Database.Query<ResetPasswordRequestEntity>()
                     .Where(r => r.Code == code && !r.Lapsed)
                     .SingleEx();

                if (rpr == null)
                    throw new NullReferenceException("ResetPasswordRequest not found");

                if (ValidateSubCode != null)
                {
                    var res = ValidateSubCode(subCode, rpr.User);
                    if (res != null)
                        throw new InvalidOperationException(res);
                }

                using (Transaction tr = new Transaction())
                {
                    using (UserHolder.UserSession(rpr.User))
                    {
                        rpr.Execute(ResetPasswordRequestOperation.Execute, password);
                    }

                    if (ChangePasswordForcedHandler != null)
                    {
                        //Create random pass
                        string pass = new Random().Next(0, 9) + "" + new Random().Next(0, 9) + "" + new Random().Next(0, 9) + "" + new Random().NextUppercaseString(3) + "" + new Random().NextLowercaseString(3);

                        //Changing password
                        var res = ChangePasswordForcedHandler(pass, rpr.User);

                        //Returning password generated
                        rpr.Code = res;

                        using (Transaction trr = Transaction.NamedSavePoint("subEmail"))
                        {
                            try
                            {
                                //Sending email
                                EmailPreChangeHandler?.Invoke(null, pass, rpr.Code, rpr);
                                trr.Commit();
                            }
                            catch (Exception) { }
                        }
                    }

                    tr.Commit();
                    return rpr;
                }
            }
        }

        public static ResetPasswordRequestEntity SendResetPasswordRequestEmail(string email)
        {
            UserEntity? user;
            using (AuthLogic.Disable())
            {
                user = Database.Query<UserEntity>()
                  .Where(u => u.Email == email && u.State != UserState.Disabled)
                .SingleOrDefault();
                if (ValidateEmail != null)
                {
                    user = ValidateEmail(email)!;
                }
                else
                {
                    user = Database.Query<UserEntity>()
                      .Where(u => u.Email == email && u.State != UserState.Disabled)
                    .SingleOrDefault();
                }
                user = Database.Query<UserEntity>()
                  .Where(u => u.Email == email && u.State != UserState.Disabled)
                  .SingleOrDefault();

                if (user == null)
                    throw new ApplicationException(AuthEmailMessage.EmailNotFound.NiceToString());
            }

            try
            {
                var request = ResetPasswordRequest(user);

                string url = EmailLogic.Configuration.UrlLeft + @"/auth/ResetPassword?code={0}".FormatWith(request.Code);

                using (AuthLogic.Disable())
                    new ResetPasswordRequestEmail(request, url, null!).SendMail();

                return request;
            }
            catch (Exception ex)
            {
                ex.LogException();
                throw new ApplicationException(LoginAuthMessage.AnErrorOccurredRequestNotProcessed.NiceToString());
            }

        }

        public static bool CheckCode(string code)
        {
            {
                return Database.Query<ResetPasswordRequestEntity>()
                    .Any(r => r.Code == code && !r.Lapsed && !r.Executed);
            }
        }


        public static ResetPasswordRequestEntity ResetPasswordRequest(UserEntity user)
        {
            using (AuthLogic.Disable())
            {
                //Remove old previous requests
                Database.Query<ResetPasswordRequestEntity>()
                    .Where(r => r.User.Is(user) && r.RequestDate < TimeZoneManager.Now.AddMonths(1))
                    .UnsafeUpdate()
                    .Set(e => e.Lapsed, e => true)
                    .Execute();

                return new ResetPasswordRequestEntity()
                {
                    Code = Guid.NewGuid().ToString(),
                    User = user,
                    RequestDate = TimeZoneManager.Now,
                }.Save();
            }
        }

        public static Func<string, UserEntity?> GetUserByEmail = (email) => Database.Query<UserEntity>().Where(u => u.Email == email).SingleOrDefaultEx();
    }

    public class ResetPasswordRequestEmail : EmailModel<ResetPasswordRequestEntity>
    {
        public string Url;
        public string Email;

        public ResetPasswordRequestEmail(ResetPasswordRequestEntity entity) : this(entity, "http://wwww.tesurl.com", "test@gmail.com")
        { }

        public ResetPasswordRequestEmail(ResetPasswordRequestEntity entity, string url, string email) : base(entity)
        {
            this.Url = url;
            this.Email = email;
        }

        public override List<EmailOwnerRecipientData> GetRecipients()
        {
            var owner = Entity.User.EmailOwnerData;
            owner.Email = Email;
            return SendTo(owner);
        }
    }
}
