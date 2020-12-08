import { QueryDescription } from '@framework/FindOptions';
import * as React from 'react'

import ReactChart from './ReactChart';
import { ChartRequestModel } from '../../Signum.Entities.Chart';
import * as ChartClient from '../../ChartClient';
import { useSize, useThrottle } from '@framework/Hooks';
import { classes } from '@framework/Globals';
import { renderCombinedLinesAndColumns } from '../CombinedLinesAndColumns';

export interface ReactChartCombinedInfo {
  chartRequest: ChartRequestModel;
  data?: ChartClient.ChartTable;
  parameters: { [parameter: string]: string };
  onDrillDown: (row: ChartClient.ChartRow, e: React.MouseEvent | MouseEvent) => void;
}

export function ReactChartCombined(p: { infos: ReactChartCombinedInfo[], useSameScale: boolean }) {

  const isSimple = p.infos.every(a => a.data == null || a.data.rows.length < ReactChart.maxRowsForAnimation);
  const allData = p.infos.every(a => a.data != null);
  const oldAllData = useThrottle(allData, 200, { enabled: isSimple });
  const initialLoad = oldAllData == false && allData && isSimple;

  const { size, setContainer } = useSize();

  return (
    <div className={classes("sf-chart-container", isSimple ? "sf-chart-animable" : "")} ref={setContainer} >
      {size &&
        renderCombinedLinesAndColumns({
          infos: p.infos,
          width: size.width,
          height: size.height,
          initialLoad: initialLoad,
          useSameScale: p.useSameScale
        })
      }
    </div>
  );
}
