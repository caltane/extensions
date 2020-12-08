import * as React from 'react'
import { Link } from 'react-router-dom'
import * as d3 from 'd3'
import { } from '@framework/Globals'
import * as AppContext from '@framework/AppContext'
import { API, HeavyProfilerEntry, StackTraceTS } from '../ProfilerClient'
import { RouteComponentProps } from "react-router";
import "./Profiler.css"
import { useAPI, useSize, useAPIWithReload } from '@framework/Hooks'
import { useTitle } from '@framework/AppContext'

interface HeavyEntryProps extends RouteComponentProps<{ selectedIndex: string }> {

}

export default function HeavyEntry(p: HeavyEntryProps) {

  const selectedIndex = p.match.params.selectedIndex;
  const rootIndex = selectedIndex.tryBefore("-") ?? selectedIndex;
  const [entries, reloadEntries] = useAPIWithReload(() => API.Heavy.details(rootIndex), [rootIndex]);
  const stackTrace = useAPI(() => API.Heavy.stackTrace(selectedIndex), [selectedIndex]);
  const [asyncDepth, setAsyncDepth] = React.useState<boolean>(false);

  function handleDownload() {
    let selectedIndex = p.match.params.selectedIndex;
    API.Heavy.download(selectedIndex.tryBefore("-") ?? selectedIndex);
  }

  const index = p.match.params.selectedIndex;
  useTitle("Heavy Profiler > Entry " + index);

  if (entries == undefined)
    return <h3 className="display-6"><Link to="~/profiler/heavy">Heavy Profiler</Link> {">"} Entry {index} (loading...) </h3>;

  let current = entries.filter(a => a.fullIndex == p.match.params.selectedIndex).single();
  return (
    <div>
      <h2 className="display-6"><Link to="~/profiler/heavy">Heavy Profiler</Link> {">"} Entry {index}</h2>
      <label><input type="checkbox" checked={asyncDepth} onChange={a => setAsyncDepth(a.currentTarget.checked)} />Async Stack</label>
      <br />
      {entries && <HeavyProfilerDetailsD3 entries={entries} selected={current} asyncDepth={asyncDepth} />}
      <br />
      <table className="table table-nonfluid">
        <tbody>
          <tr>
            <th>Role</th>
            <td>{current.role}</td>
          </tr>
          <tr>
            <th>Time</th>
            <td>{current.elapsed}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <div className="btn-toolbar">
                <button onClick={handleDownload} className="btn btn-info">Download</button>
                {!current.isFinished && <button onClick={() => reloadEntries()} className="btn btn-light">Update</button>}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <br />
      <h3>Aditional Data</h3>
      <pre style={{ maxWidth: "1000px", overflowY: "scroll" }}><code>{current.additionalData}</code></pre>
      <br />
      <h3>StackTrace</h3>
      {
        stackTrace == undefined ? <span>No Stacktrace</span> :
          <StackFrameTable stackTrace={stackTrace} />
      }
    </div>
  );
}


export function StackFrameTable(p: { stackTrace: StackTraceTS[] }) {
  if (p.stackTrace == undefined)
    return <span>No StackTrace</span>;

  return (
    <table className="table table-sm">
      <thead>
        <tr>
          <th>Namespace</th>
          <th>Type</th>
          <th>Method</th>
          <th>FileLine</th>
        </tr>
      </thead>
      <tbody>
        {p.stackTrace.map((sf, i) =>
          <tr key={i}>
            <td>
              {sf.namespace && <span style={{ color: sf.color }}>{sf.namespace}</span>}
            </td>
            <td>
              {sf.type && <span style={{ color: sf.color }}>{sf.type}</span>}
            </td>
            <td>
              {sf.method}
            </td>
            <td>
              {sf.fileName} {sf.lineNumber > 0 && "(" + sf.lineNumber + ")"}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function lerp(min: number, ratio: number, max: number) {
  return min * (1 - ratio) + max * ratio;
}

interface HeavyProfilerDetailsD3Props {
  entries: HeavyProfilerEntry[];
  selected: HeavyProfilerEntry;
  asyncDepth: boolean;
}

interface MinMax {
  min: number;
  max: number;
}

export function HeavyProfilerDetailsD3(p: HeavyProfilerDetailsD3Props) {

  const [minMax, setMinMax] = React.useState<MinMax>(() => resetZoom(p.selected));

  const chartContainer = React.useRef<HTMLDivElement | null>(null);

  function resetZoom(current: HeavyProfilerEntry): MinMax {
    return ({
      min: lerp(current.beforeStart, -0.1, current.end),
      max: lerp(current.beforeStart, 1.1, current.end)
    });
  }

  var { size, setContainer } = useSize();

  React.useEffect(() => {
    chartContainer.current!.addEventListener("wheel", handleWeel, { passive: false, capture: true });
    return () => {
      chartContainer.current!.removeEventListener("wheel", handleWeel);
    };
  }, []);

  function handleWeel(e: WheelEvent) {
    e.preventDefault();
    e.stopPropagation();

    setMinMax(minMax => {

      let dist = minMax.max - minMax.min;

      const inc = 1.2;

      let delta = 1 - (e.deltaY > 0 ? (1 / inc) : inc);

      let elem = e.currentTarget as HTMLElement;

      let ne = e/*.nativeEvent*/ as MouseEvent;

      const rect = elem.getBoundingClientRect();

      const ratio = (ne.clientX - rect.left) / rect.width;

      let newMin = minMax.min - dist * delta * (ratio);
      let newMax = minMax.max + dist * delta * (1 - ratio);

      return ({
        min: newMin,
        max: newMax
      });
    });
  }

  const data = p.entries;

  const getDepth = p.asyncDepth ?
    (e: HeavyProfilerEntry) => e.asyncDepth :
    (e: HeavyProfilerEntry) => e.depth;

  const fontSize = 12;
  const fontPadding = 3;
  const maxDepth = d3.max(data, getDepth)!;

  const height = ((fontSize * 2) + (3 * fontPadding)) * (maxDepth + 1);

  const setChartContainer = React.useCallback((e: HTMLDivElement | null) => { setContainer(e); chartContainer.current = e; }, [setContainer, chartContainer]);

  return (
    <div className="sf-profiler-chart" ref={setChartContainer} style={{ height: height + "px" }}>
      {size && drawChart(size.width)}
    </div>
  );

  function drawChart(width: number) {

    const y = d3.scaleLinear()
      .domain([0, maxDepth + 1])
      .range([0, height]);

    const { min, max } = minMax;

    const sel = p.selected;
    let x = d3.scaleLinear()
      .domain([min, max])
      .range([0, width]);

    let entryHeight = y(1)!;

    var filteredData = data.filter(a => a.end > min && a.beforeStart < max && (x(a.end)! - x(a.beforeStart)!) > 1);

    function handleOnClick(e: React.MouseEvent<SVGGElement>, d: HeavyProfilerEntry) {
      if (d == p.selected) {

      }
      else {
        let url = "~/profiler/heavy/entry/" + d.fullIndex;

        if (e.ctrlKey) {
          window.open(AppContext.toAbsoluteUrl(url));
        }
        else {
          AppContext.history.push(url);
        }
      }
    }

    return (
      <svg height={height + "px"} width={width}>
        {filteredData.map(d =>
          <g className="entry" data-key={d.fullIndex} key={d.fullIndex} onClick={e => handleOnClick(e, d)} onDoubleClick={e => setMinMax(resetZoom(d))}>
            <rect className="shape"
              y={y(getDepth(d))}
              x={x(Math.max(min, d.beforeStart))}
              height={entryHeight - 1}
              width={Math.max(0, x(Math.min(max, d.end))! - x(Math.max(min, d.beforeStart))!)}
              fill={d.color}
              stroke={d == sel ? '#000' : '#ccc'} />
            <rect className="shape-before"
              y={y(getDepth(d))! + 1}
              x={x(Math.max(min, d.beforeStart))}
              height={entryHeight - 2}
              width={Math.max(0, x(Math.min(max, d.start))! - x(Math.max(min, d.beforeStart))!)}
              fill={d.color} />
            <text className="label label-top"
              y={y(getDepth(d))}
              x={x(Math.max(min, d.start))! + 3}
              dy={fontPadding + fontSize}
              fill={d == sel ? '#000' : '#fff'}>
              {d.elapsed}
            </text>
            <text className="label label-bottom"
              y={y(getDepth(d))}
              dy={(2 * fontPadding) + (2 * fontSize)}
              x={x(Math.max(min, d.start))! + 3}
              fill={d == sel ? '#000' : '#fff'}>
              {d.role + (d.additionalData ? (" - " + d.additionalData.etc(30)) : "")}
            </text>
            <title>{d.role + d.elapsed}</title>
          </g>
        )}
      </svg>
    );
  }
}
