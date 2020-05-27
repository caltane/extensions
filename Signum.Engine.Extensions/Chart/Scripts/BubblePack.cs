
using Signum.Engine.Chart;
using Signum.Entities.Chart;
using System.Collections.Generic;

namespace Signum.Engine.Chart.Scripts 
{
    public class BubblePackChartScript : ChartScript                
    {
        public BubblePackChartScript() : base(D3ChartScript.BubblePack)
        {
            this.Icon = ChartScriptLogic.LoadIcon("bubblepack.png");
            this.Columns = new List<ChartScriptColumn>
            {
                new ChartScriptColumn("Bubble", ChartColumnType.Groupable),
                new ChartScriptColumn("Size", ChartColumnType.Magnitude) ,
                new ChartScriptColumn("Parent", ChartColumnType.Groupable) { IsOptional = true },
                new ChartScriptColumn("Color Scale", ChartColumnType.Magnitude) { IsOptional = true },
                new ChartScriptColumn("Color Category", ChartColumnType.Groupable) { IsOptional = true }
            };
            this.ParameterGroups = new List<ChartScriptParameterGroup>
            {
                new ChartScriptParameterGroup()
                {
                    new ChartScriptParameter("Scale", ChartParameterType.Enum) { ColumnIndex = 1, ValueDefinition = EnumValueList.Parse("ZeroMax|MinMax|Log") },
                },
                new ChartScriptParameterGroup("Stroke")
                {
                    new ChartScriptParameter("StrokeColor", ChartParameterType.String) {  ValueDefinition = new StringValue("") },
                    new ChartScriptParameter("StrokeWidth", ChartParameterType.Number) {  ValueDefinition = new NumberInterval { DefaultValue = 2m } },
                },
                new ChartScriptParameterGroup("Number")
                {
                    new ChartScriptParameter("NumberOpacity", ChartParameterType.Number) {  ValueDefinition = new NumberInterval { DefaultValue = 0.8m } },
                    new ChartScriptParameter("NumberSizeLimit", ChartParameterType.Number) {  ValueDefinition = new NumberInterval { DefaultValue = 18m } },
                    new ChartScriptParameter("NumberColor", ChartParameterType.String) {  ValueDefinition = new StringValue("#fff") }
                },
                new ChartScriptParameterGroup("Opacity")
                {
                    new ChartScriptParameter("FillOpacity", ChartParameterType.Number) {  ValueDefinition = new NumberInterval { DefaultValue = 0.8m } },
                },
                new ChartScriptParameterGroup("Color Scale")
                {
                    new ChartScriptParameter("ColorScale", ChartParameterType.Enum) { ColumnIndex = 3, ValueDefinition = EnumValueList.Parse("ZeroMax|MinMax|Sqrt|Log") },
                    new ChartScriptParameter("ColorInterpolate", ChartParameterType.Enum) {  ColumnIndex = 3, ValueDefinition = EnumValueList.Parse("YlGn|YlGnBu|GnBu|BuGn|PuBuGn|PuBu|BuPu|RdPu|PuRd|OrRd|YlOrRd|YlOrBr|Purples|Blues|Greens|Oranges|Reds|Greys|PuOr|BrBG|PRGn|PiYG|RdBu|RdGy|RdYlBu|Spectral|RdYlGn") },
                },
                new ChartScriptParameterGroup("Color Category")
                {
                    new ChartScriptParameter("ColorCategory", ChartParameterType.Enum) { ColumnIndex = 4, ValueDefinition = EnumValueList.Parse("category10|accent|dark2|paired|pastel1|pastel2|set1|set2|set3|BrBG[K]|PRGn[K]|PiYG[K]|PuOr[K]|RdBu[K]|RdGy[K]|RdYlBu[K]|RdYlGn[K]|Spectral[K]|Blues[K]|Greys[K]|Oranges[K]|Purples[K]|Reds[K]|BuGn[K]|BuPu[K]|OrRd[K]|PuBuGn[K]|PuBu[K]|PuRd[K]|RdPu[K]|YlGnBu[K]|YlGn[K]|YlOrBr[K]|YlOrRd[K]") },
                    new ChartScriptParameter("ColorCategorySteps", ChartParameterType.Enum) {  ColumnIndex = 4, ValueDefinition = EnumValueList.Parse("3|4|5|6|7|8|9|10|11") },
                },
            };
        }      
    }                
}
