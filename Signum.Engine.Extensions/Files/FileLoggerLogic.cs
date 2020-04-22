using System;
using Signum.Engine.Maps;
using Signum.Engine.DynamicQuery;
using Signum.Entities.Files;
using System.Reflection;
using System.Linq.Expressions;
using Signum.Entities;
using Signum.Utilities;
using Signum.Engine.Basics;
using Signum.Engine.Operations;
using Signum.Entities.Basics;
using Signum.Entities.Authorization;
using Signum.Engine.Authorization;

namespace Signum.Engine.Files
{
    public static class FileLoggerLogic
    {
        public static void Start(SchemaBuilder sb)
        {
            if (sb.NotDefined(MethodInfo.GetCurrentMethod()))
            {
                sb.Include<FileLoggerEntity>()
                    .WithQuery(() => a => new
                    {
                        Entity = a,
                        a.Id,
                        a.AlgorithmType,
                        a.Action,
                        a.User,
                        a.Date
                    });

                PermissionAuthLogic.RegisterPermissions(FileLoggerPermission.TrackDownload);

            }
        }

        static bool RoleTracked(Lite<RoleEntity> role)
        {
            return FileLoggerPermission.TrackDownload.IsAuthorized(role);
        }

        public static void OnLogger(IFileTypeAlgorithm t, IFilePath fp, FileLoggerActionType action)
        {
            var user = UserEntity.Current;
            if (FileLoggerLogic.RoleTracked(user.Role))
            {
                using (AuthLogic.Disable())
                {
                    (new FileLoggerEntity
                    {
                        FileName = fp.FileName,
                        FullPhysicalPath = fp.FullPhysicalPath(),
                        FileType = fp.FileType,
                        User = user.ToLite(),
                        Action = action,
                        AlgorithmType = t.GetType().Name,
                        Date = TimeZoneManager.Now,
                    }).Save();
                }
            }
        }

    }
}
