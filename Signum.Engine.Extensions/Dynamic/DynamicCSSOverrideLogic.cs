using Signum.Engine.DynamicQuery;
using Signum.Engine.Maps;
using Signum.Engine.Operations;
using Signum.Entities.Basics;
using Signum.Entities.Dynamic;
using Signum.Utilities;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Signum.Engine.Dynamic
{

    public static class DynamicCSSOverrideLogic
    {
        public static ResetLazy<List<DynamicCSSOverrideEntity>> Cached = null!;

        public static void Start(SchemaBuilder sb)
        {
            if (sb.NotDefined(MethodBase.GetCurrentMethod()))
            {
                sb.Include<DynamicCSSOverrideEntity>()
                   .WithSave(DynamicCSSOverrideOperation.Save)
                   .WithDelete(DynamicCSSOverrideOperation.Delete)
                   .WithQuery(() => e => new
                   {
                       Entity = e,
                       e.Id,
                       e.Name,
                       Script = e.Script.Etc(100),
                   });

                Cached = sb.GlobalLazy(() =>
                 Database.Query<DynamicCSSOverrideEntity>().Where(a => !a.Mixin<DisabledMixin>().IsDisabled).ToList(),
                 new InvalidateWith(typeof(DynamicCSSOverrideEntity)));
            }
        }
    }
}

// In order to work this module, you should apply below mentioned changes to your index.cshtml file
/*
@using Signum.Utilities;
@using Signum.Engine.Dynamic; <====*

@{
   ...
    var cssOverride = String.Join("\r\n", DynamicCSSOverrideLogic.Cached.Value.Select(a => a.Script)); <====*
}
<!doctype html>
<html>
<head>
     ...
</head>
<body>
    <style type="text/css">@cssOverride</style> <====*
    <div id="reactDiv"></div>
   ...
</body>
</html>
 
*/
