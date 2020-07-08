using System;
using System.Linq;
using System.Text;
using Signum.Entities.Scheduler;
using Signum.Engine.Maps;
using Signum.Engine.Basics;
using Signum.Entities;
using Signum.Engine.DynamicQuery;
using System.Reflection;
using Signum.Entities.Basics;
using System.Threading;

namespace Signum.Engine.Scheduler
{
    public static class SystemEventLogLogic
    {
        public static bool Started = false;

        public static void Start(SchemaBuilder sb)
        {
            if (sb.NotDefined(MethodInfo.GetCurrentMethod()))
            {
                sb.Include<SystemEventLogEntity>()
                    .WithQuery(() => s => new
                    {
                        Entity = s,
                        s.Id,
                        s.Date,
                        s.MachineName,
                        s.EventType,
                        s.Exception,
                    });
                
                ExceptionLogic.DeleteLogs += ExceptionLogic_DeleteLogs;

                Started = true;
            }
        }

        public static void ExceptionLogic_DeleteLogs(DeleteLogParametersEmbedded parameters, StringBuilder sb, CancellationToken token)
        {
            void Remove(DateTime? dateLimit, bool withExceptions)
            {
                if (dateLimit == null)
                    return;

                var query = Database.Query<SystemEventLogEntity>().Where(a => a.Date < dateLimit);

                if (withExceptions)
                    query = query.Where(a => a.Exception != null);

                query.UnsafeDeleteChunksLog(parameters, sb, token);
            }

            Remove(parameters.GetDateLimitDelete(typeof(SystemEventLogEntity).ToTypeEntity()), withExceptions: false);
            Remove(parameters.GetDateLimitDeleteWithExceptions(typeof(SystemEventLogEntity).ToTypeEntity()), withExceptions: true);
        }

        public static bool Log(string eventType, ExceptionEntity? exception = null)
        {
            if (!Started)
                return false;
            try
            {
                using (Transaction tr = Transaction.ForceNew())
                {
                    using (ExecutionMode.Global())
                        new SystemEventLogEntity
                        {
                            Date = TimeZoneManager.Now,
                            MachineName = Environment.MachineName,
                            User = UserHolder.Current?.ToLite(),
                            EventType = eventType,
                            Exception = exception?.ToLite()
                        }.Save();

                    tr.Commit();
                }

                return true;
            }
            catch (Exception e)
            {
                e.LogException(ex => ex.ControllerName = "SystemEventLog.Log");

                return false;
            }
        }
    }
}
