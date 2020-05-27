using System;
using System.IO;
using Signum.Utilities;
using Signum.Services;
using Signum.Entities.Basics;
using Signum.Entities.Authorization;

namespace Signum.Entities.Files
{
    #region FileLogger

    [Serializable, EntityKind(EntityKind.System, EntityData.Transactional), TicksColumn(false), InTypeScript(Undefined = false)]
    public class FileLoggerEntity : Entity
    {

        public string AlgorithmType { get; set; }
        public string FileName { get; set; }
        public string FullPhysicalPath { get; set; }
        public FileTypeSymbol FileType { get; set; }
        public FileLoggerActionType Action { get; set; }
        public Lite<IUserEntity> User { get; set; } = UserHolder.Current.ToLite();
        public DateTime Date { get; set; } = TimeZoneManager.Now;

        public override string ToString()
        {
            return "{0} ({1}-{2})".FormatWith(User?.ToString(), Date, Action);
        }
    }

    public enum FileLoggerActionType
    {
        Read,
        Write,
        Move,
        Delete
    }

    [AutoInit]
    public static class FileLoggerPermission
    {
        public static PermissionSymbol TrackDownload;
    }

    #endregion 

}
