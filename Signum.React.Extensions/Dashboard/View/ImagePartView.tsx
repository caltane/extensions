import * as React from 'react'
import { ImagePartEntity } from '../Signum.Entities.Dashboard';
import { PanelPartContentProps } from '../DashboardClient';

export default function ImagePart(p: PanelPartContentProps<ImagePartEntity>) {
  return (
    <div className="form-inline">
      <img src={p.part.imageSrcContent} style={{ width: "100%" }} />
    </div>
  );
}
