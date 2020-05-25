import * as React from 'react'
import { ImagePartEntity } from '../Signum.Entities.Dashboard';
import { TypeContext, ValueLine } from '../../../../Framework/Signum.React/Scripts/Lines';

export default function ImagePart(p: { ctx: TypeContext<ImagePartEntity> }) {
  const ctx = p.ctx.subCtx({ formGroupStyle: "SrOnly", placeholderLabels: true });

  return (
    <div className="form-inline">
      <ValueLine ctx={ctx.subCtx(c => c.imageSrcContent)} />
    </div>
  );
}
