import * as React from 'react';
import * as Navigator from '@framework/Navigator'
import { PanelPartContentProps } from '../DashboardClient';
import { ImagePartEntity } from '../Signum.Entities.Dashboard';


export default function ImagePart(p: PanelPartContentProps<ImagePartEntity>) {
  return (
    <div>
      <a href={p.part.clickActionURL ? Navigator.toAbsoluteUrl(p.part.clickActionURL!) : null}
        onClick={p.part.clickActionURL?.startsWith("~") ? (e => { e.preventDefault(); Navigator.history.push(p.part.clickActionURL!) }) : undefined}>
        <img src={p.part.imageSrcContent} style={{ width: "100%" }} />
      </a>
    </div>
  );
}
