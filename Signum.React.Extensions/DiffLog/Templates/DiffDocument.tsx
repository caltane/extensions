import * as React from 'react'
import { DiffPair } from '../DiffLogClient';
import { NumericTextBox, ValueLine, isNumber } from '@framework/Lines/ValueLine';
import { useForceUpdate } from '@framework/Hooks'

export function DiffDocument(p: { diff: Array<DiffPair<Array<DiffPair<string>>>> }) {

  const [margin, setMargin] = React.useState<number | null>(DiffDocument.defaultMarginLines)

  return (
    <div>
      <div>
        <label>
          <input type="checkbox" checked={margin != null} onChange={() => setMargin(margin == null ? DiffDocument.defaultMarginLines : null)} />
          <span className="mx-2">Show only</span><NumericTextBox value={margin == null ? 4 : margin} onChange={num => setMargin(num == null ? 0 : Math.max(num, 0))}
            validateKey={isNumber} /> lines arround each change</label>
      </div>
      <div>
        <DiffDocumentSimple diff={p.diff} margin={margin} />
      </div>
    </div>
  );
}

DiffDocument.defaultMarginLines = 4 as (number | null);


export function DiffDocumentSimple({ diff, margin }: { diff: Array<DiffPair<Array<DiffPair<string>>>>, margin?: number | null }) {


  function renderDiffLine(list: Array<DiffPair<string>>): Array<React.ReactElement<any>> {
    const result = list.map((a, i) => {
      if (a.action == "Equal")
        return <span key={i}>{a.value}</span>;
      else if (a.action == "Added")
        return <span key={i} style={{ backgroundColor: "#72F272" }}>{a.value}</span>;
      else if (a.action == "Removed")
        return <span key={i} style={{ backgroundColor: "#FF8B8B" }}>{a.value}</span>;
      else
        throw Error("");
    });

    result.push(<br key={result.length} />);
    return result;
  }


  var indices = margin == null ? Array.range(0, diff.length) :
    expandNumbers(diff.map((a, i) => a.action != "Equal" || a.value.length != 1 ? i : null).filter(n => n != null) as number[], diff.length, margin);

  const result =
    indices
      .flatMap(ix => {
        if (typeof ix == "object")
          return [<span style={{ backgroundColor: "#DDD" }}><span> ----- {ix.numLines} Lines Removed ----- </span><br /></span>];

        var line = diff[ix];

        if (line.action == "Removed") {
          return [<span style={{ backgroundColor: "#FFD1D1" }}>{renderDiffLine(line.value)}</span>];
        }
        if (line.action == "Added") {
          return [<span style={{ backgroundColor: "#CEF3CE" }}>{renderDiffLine(line.value)}</span>];
        }
        else if (line.action == "Equal") {
          if (line.value.length == 1) {
            return [<span>{renderDiffLine(line.value)}</span>];
          }
          else {
            return [
              <span style={{ backgroundColor: "#FFD1D1" }}>{renderDiffLine(line.value.filter(a => a.action == "Removed" || a.action == "Equal"))}</span>,
              <span style={{ backgroundColor: "#CEF3CE" }}>{renderDiffLine(line.value.filter(a => a.action == "Added" || a.action == "Equal"))}</span>
            ];
          }
        }
        else
          throw new Error("Unexpected");
      });

  return <pre className="m-0">{result.map((e, i) => React.cloneElement(e, { key: i }))}</pre>;
}

interface LinesRemoved {
  numLines: number;
}

export function expandNumbers(changes: number[], max: number, margin: number): (number | LinesRemoved)[] {

  if (changes.length == 0)
    return [];

  const result: (number | LinesRemoved)[] = [];
  var lastChange = changes[0];

  var prev0 = lastChange - margin;

  function pushRange(from: number, to: number) {
    for (var j = from; j <= to; j++) {
      result.push(j);
    }
  }

  if (prev0 <= 0) {
    pushRange(0, lastChange);
  } else {
    result.push({ numLines: prev0 });
    pushRange(prev0, lastChange);
  }

  for (var i = 1; i < changes.length; i++) {
    const nextLastChange = lastChange + margin;
    const newChange = changes[i];
    const prevNewChange = newChange - margin;

    if (nextLastChange + 1 < prevNewChange) {
      pushRange(lastChange + 1, nextLastChange)
      result.push({ numLines: prevNewChange - nextLastChange });
      pushRange(prevNewChange, newChange);
    } else {
      pushRange(lastChange + 1, newChange);
    }
    lastChange = newChange;
  }

  const nextN = lastChange + margin;
  if (nextN < max) {
    pushRange(lastChange + 1, nextN);
    result.push({ numLines: max - nextN });
  } else {
    pushRange(lastChange + 1, max - 1);
  }

  return result;
}
