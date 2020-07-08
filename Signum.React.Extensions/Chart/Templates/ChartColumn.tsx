import * as React from 'react'
import { classes } from '@framework/Globals'
import { SubTokensOptions } from '@framework/FindOptions'
import { TypeContext, StyleContext } from '@framework/TypeContext'
import { tryGetTypeInfos, TypeInfo, isTypeEnum } from '@framework/Reflection'
import * as Navigator from '@framework/Navigator'
import { ValueLine, FormGroup } from '@framework/Lines'
import { ChartColumnEmbedded, IChartBase, ChartMessage, ChartColorEntity, ChartColumnType, ChartParameterEmbedded } from '../Signum.Entities.Chart'
import * as ChartClient from '../ChartClient'
import { ChartScriptColumn, ChartScript } from '../ChartClient'
import * as ChartPaletteClient from '../ChartPalette/ChartPaletteClient'
import QueryTokenEntityBuilder from '../../UserAssets/Templates/QueryTokenEmbeddedBuilder'
import { External } from '@framework/Signum.Entities';
import { useForceUpdate } from '../../../../Framework/Signum.React/Scripts/Hooks'
import { Parameters } from './ChartBuilder'

export interface ChartColumnProps {
  ctx: TypeContext<ChartColumnEmbedded>;
  columnIndex: number;
  scriptColumn: ChartScriptColumn;
  chartScript: ChartScript;
  chartBase: IChartBase;
  queryKey: string;
  colorPalettes: string[];
  onRedraw: () => void;
  parameterDic: { [name: string]: TypeContext<ChartParameterEmbedded> },
  onOrderChanged: (chartColumn: ChartColumnEmbedded, e: React.MouseEvent<any>) => void;
  onTokenChange: () => void;
}


export function ChartColumn(p: ChartColumnProps) {

  const forceUpdate = useForceUpdate();

  const [expanded, setExpanded] = React.useState<boolean>(false);

  function handleExpanded() {
    setExpanded(!expanded);
  }

  function handleDragOver(de: React.DragEvent<any>, ) {
    de.preventDefault();
    var txt = de.dataTransfer.getData("text");
    const cols = p.chartBase.columns;
    if (txt.startsWith("chartColumn_")) {
      var dropIndex = cols.findIndex(a => a.element == p.ctx.value);
      var dragIndex = parseInt(txt.after("chartColumn_"));
      if (dropIndex == dragIndex)
        de.dataTransfer.dropEffect = "none";
    }
  }

  function handleOnDrop(de: React.DragEvent<any>, ) {
    de.preventDefault();

    const cols = p.chartBase.columns;
    var txt = de.dataTransfer.getData("text");
    if (txt.startsWith("chartColumn_")) {

      var dropIndex = cols.findIndex(a => a.element == p.ctx.value);
      var dragIndex = parseInt(txt.after("chartColumn_"));

      if (dropIndex != dragIndex) {
        var temp = cols[dropIndex].element.token;
        cols[dropIndex].element.token = cols[dragIndex].element.token;
        cols[dragIndex].element.token = temp;
        p.onTokenChange();
      }

    }
  }

  function handleDragStart(de: React.DragEvent<any>, ) {
    const dragIndex = p.chartBase.columns.findIndex(a => a.element == p.ctx.value);
    de.dataTransfer.setData('text', "chartColumn_" + dragIndex); //cannot be empty string
    de.dataTransfer.effectAllowed = "move";
  }


  function getColorPalettes() {
    const token = p.ctx.value.token;

    const t = token?.token!.type;

    if (t == undefined || Navigator.isReadOnly(ChartColorEntity, { ignoreTypeIsReadonly: true }))
      return [];

    if (!t.isLite && !isTypeEnum(t.name))
      return [];

    return tryGetTypeInfos(t);
  }

  function orderClassName(c: ChartColumnEmbedded) {
    if (c.orderByType == null || c.orderByIndex == null)
      return "";

    return (c.orderByType == "Ascending" ? "asc" : "desc") + (" l" + c.orderByIndex);
  }
  const sc = p.scriptColumn;
  const cb = p.chartBase;

  const subTokenOptions = SubTokensOptions.CanElement | SubTokensOptions.CanAggregate;

  const ctx = p.ctx;

  const ctxBasic = ctx.subCtx({ formSize: "ExtraSmall", formGroupStyle: "Basic" });

  var numParameters = p.chartScript.parameterGroups.flatMap(a => a.parameters).filter(a => a.columnIndex == p.columnIndex).length

  return (
    <>
      <tr className="sf-chart-token">
        <th
          draggable={true}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDrop={handleOnDrop}
          onDragStart={handleDragStart}

          onClick={e => ctx.value.token && p.onOrderChanged(ctx.value, e)}
          style={{ whiteSpace: "nowrap", cursor: ctx.value.token ? "pointer" : undefined, userSelect: "none" }}>
          <span className={"sf-header-sort " + orderClassName(ctx.value)} />
          {sc.displayName + (sc.isOptional ? "?" : "")}
        </th>
        <td>
          <div className={classes("sf-query-token")}>
            <QueryTokenEntityBuilder
              ctx={ctx.subCtx(a => a.token, { formGroupStyle: "None" })}
              queryKey={p.queryKey}
              subTokenOptions={subTokenOptions} onTokenChanged={() => p.onTokenChange()} />
          </div>
          <span style={{
            color: ctx.value.token == null ? "#ddd" :
              ChartClient.isChartColumnType(ctx.value.token.token, sc.columnType) ? "#52b980" : "#ff7575",
            marginLeft: "10px",
            cursor: "default"
          }} title={getTitle(sc.columnType).map(a => ChartColumnType.niceToString(a)).join("\n")}>
            {ChartColumnType.niceToString(sc.columnType)}
          </span>
          <a className={classes("sf-chart-token-config-trigger", numParameters > 0 && ctx.value.token && "font-weight-bold")} onClick={handleExpanded}>{ChartMessage.Chart_ToggleInfo.niceToString()} {numParameters > 0 && ctx.value.token && <span>({numParameters})</span>} </a>
        </td>
      </tr>
      {expanded && <tr className="sf-chart-token-config">
        <td></td>
        <td colSpan={1}>
          <div>
            <div className="row">
              <div className="col-sm-3">
                <ValueLine ctx={ctxBasic.subCtx(a => a.displayName)} valueHtmlAttributes={{ onBlur: p.onRedraw, placeholder: ctx.value.token?.token?.niceName }} />
              </div>
              <div className="col-sm-3">
                <ValueLine ctx={ctxBasic.subCtx(a => a.format)} valueHtmlAttributes={{ onBlur: p.onRedraw, placeholder: ctx.value.token?.token?.format }} />
              </div>
              {getColorPalettes().map((t, i) =>
                <div className="col-sm-3" key={i}>
                  {t && <ChartPaletteLink ctx={ctxBasic} type={t} currentPalettes={p.colorPalettes} refresh={forceUpdate} />}
                </div>)
              }
            </div>
            <Parameters chart={p.chartBase} chartScript={p.chartScript} columnIndex={p.columnIndex} parameterDic={p.parameterDic} onRedraw={p.onRedraw} />
          </div>
        </td>
      </tr>
      }
    </>
  );
}

function getTitle(ct: ChartColumnType): ChartColumnType[] {
  switch (ct) {
    case "Groupable": return ["String", "Lite", "Enum", "Date", "Integer", "RealGroupable"];
    case "Magnitude": return ["Integer", "Real", "RealGroupable"];
    case "Positionable": return ["Integer", "Real", "RealGroupable", "Date", "DateTime"];
    default: return [];
  }
}

export interface ChartPaletteLinkProps {
  type: TypeInfo;
  currentPalettes: string[];
  refresh: () => void;
  ctx: StyleContext;
}

export const ChartPaletteLink = (props: ChartPaletteLinkProps) =>
  <FormGroup ctx={props.ctx}
    labelText={ChartMessage.ColorsFor0.niceToString(props.type.niceName)}>
    <a href="#" className={props.ctx.formControlPlainTextClass} onClick={e => {
      e.preventDefault();
      ChartPaletteClient.navigatePalette(props.type)
        .then(() => props.refresh())
        .done();
    }}>
      {props.currentPalettes.contains(props.type.name) ? ChartMessage.ViewPalette.niceToString() : ChartMessage.CreatePalette.niceToString()}
    </a>
  </FormGroup>;



