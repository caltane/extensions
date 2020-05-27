import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { FormGroup, FormControlReadonly, ValueLine, EntityTable, StyleContext, OptionItem, LineBaseProps } from '@framework/Lines'
import { ValueSearchControl } from '@framework/Search'
import { TypeContext } from '@framework/TypeContext'
import { NeuralNetworkSettingsEntity, PredictorEntity, PredictorColumnUsage, PredictorCodificationEntity, NeuralNetworkHidenLayerEmbedded, PredictorAlgorithmSymbol, NeuralNetworkLearner } from '../Signum.Entities.MachineLearning'
import { API } from '../PredictorClient';
import { is } from '@framework/Signum.Entities';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import { useForceUpdate, useAPI } from '@framework/Hooks'

export default function NeuralNetworkSettings(p : { ctx: TypeContext<NeuralNetworkSettingsEntity> }){
  const forceUpdate = useForceUpdate();
  function handlePredictionTypeChanged() {
    var nn = p.ctx.value;
    if (nn.predictionType == "Classification" || nn.predictionType == "MultiClassification") {
      nn.lossFunction = "CrossEntropyWithSoftmax";
      nn.evalErrorFunction = "ClassificationError";
    } else {
      nn.lossFunction = "SquaredError";
      nn.evalErrorFunction = "SquaredError";
    }
  }


  function getHelpBlock(learner: NeuralNetworkLearner | undefined) {
    switch (learner) {
      case "AdaDelta": return "Did not work :S";
      case "AdaGrad": return "";
      case "Adam": return "";
      case "FSAdaGrad": return "";
      case "MomentumSGD": return "";
      case "RMSProp": return "";
      case "SGD": return "";
      default: throw new Error("Unexpected " + learner)
    }
  }

  //Values found letting a NN work for a night learning y = sin(x * 5), no idea if they work ok for other cases
  function handleLearnerChange() {
    var nns = p.ctx.value;
    switch (nns.learner) {
      case "Adam":
        nns.learningRate = 1;
        nns.learningMomentum = 0.1;
        nns.learningVarianceMomentum = 0.1;
        nns.learningUnitGain = false;
        break;
      case "AdaDelta":
        nns.learningRate = 1;
        nns.learningMomentum = nns.learningVarianceMomentum = nns.learningUnitGain = null;
        break;
      case "AdaGrad":
        nns.learningRate = 0.1;
        nns.learningMomentum = nns.learningVarianceMomentum = nns.learningUnitGain = null;
        break;
      case "FSAdaGrad":
        nns.learningRate = 0.1;
        nns.learningMomentum = 0.01;
        nns.learningVarianceMomentum = 1;
        nns.learningUnitGain = false;
        break;
      case "MomentumSGD":
        nns.learningRate = 0.1;
        nns.learningMomentum = 0.01;
        nns.learningVarianceMomentum = 0.001;
        nns.learningUnitGain = false;
        break;
      case "RMSProp":
        nns.learningRate = 0.1;
        nns.learningMomentum = 0.01;
        nns.learningVarianceMomentum = 1;
        nns.learningUnitGain = false;
        break;
      case "SGD":
        nns.learningRate = 0.1;
        nns.learningMomentum = nns.learningVarianceMomentum = nns.learningUnitGain = null;
        break;
      default:
    }

    forceUpdate();
  }

  function renderCount(ctx: StyleContext, p: PredictorEntity, usage: PredictorColumnUsage) {
    return (
      <FormGroup ctx={ctx} labelText={PredictorColumnUsage.niceToString(usage) + " columns"}>
        {p.state != "Trained" ? <FormControlReadonly ctx={ctx}>?</FormControlReadonly> : <ValueSearchControl isBadge={true} isLink={true} findOptions={{
          queryName: PredictorCodificationEntity,
          parentToken: PredictorCodificationEntity.token(e => e.predictor),
          parentValue: p,
          filterOptions: [
            { token: PredictorCodificationEntity.token(e => e.usage), value: usage }
          ]
        }} />}
      </FormGroup>
    );
  }
  const ctx = p.ctx;

  var pred = ctx.findParent(PredictorEntity);

  const ctxb = ctx.subCtx({ formGroupStyle: "Basic" })
  const ctx6 = ctx.subCtx({ labelColumns: 8 })

  return (
    <div>
      <h4>{NeuralNetworkSettingsEntity.niceName()}</h4>
      {pred.algorithm && <DeviceLine ctx={ctx.subCtx(a => a.device)} algorithm={pred.algorithm} />}
      <ValueLine ctx={ctx.subCtx(a => a.predictionType)} onChange={handlePredictionTypeChanged} />
      {renderCount(ctx, pred, "Input")}
      <EntityTable ctx={ctx.subCtx(a => a.hiddenLayers)} columns={EntityTable.typedColumns<NeuralNetworkHidenLayerEmbedded>([
        { property: a => a.size, headerHtmlAttributes: { style: { width: "33%" } } },
        { property: a => a.activation, headerHtmlAttributes: { style: { width: "33%" } } },
        { property: a => a.initializer, headerHtmlAttributes: { style: { width: "33%" } } },
      ])} />
      <div>
        <div className="row">
          <div className="col-sm-4">
            {renderCount(ctxb, pred, "Output")}
          </div>
          <div className="col-sm-4">
            <ValueLine ctx={ctxb.subCtx(a => a.outputActivation)} />
          </div>
          <div className="col-sm-4">
            <ValueLine ctx={ctxb.subCtx(a => a.outputInitializer)} />
          </div>
        </div>
        <div className="row">
          <div className="col-sm-4">
          </div>
          <div className="col-sm-4">
            <ValueLine ctx={ctxb.subCtx(a => a.lossFunction)} />
          </div>
          <div className="col-sm-4">
            <ValueLine ctx={ctxb.subCtx(a => a.evalErrorFunction)} />
          </div>

        </div>
      </div>
      <hr />
      <div className="row">
        <div className="col-sm-6">
          <ValueLine ctx={ctx6.subCtx(a => a.learner)} onChange={handleLearnerChange} helpText={getHelpBlock(ctx.value.learner)} />
          <ValueLine ctx={ctx6.subCtx(a => a.learningRate)} />
          <ValueLine ctx={ctx6.subCtx(a => a.learningMomentum)} formGroupHtmlAttributes={hideFor(ctx6, "AdaDelta", "AdaGrad", "SGD")} />
          {withHelp(<ValueLine ctx={ctx6.subCtx(a => a.learningUnitGain)} formGroupHtmlAttributes={hideFor(ctx6, "AdaDelta", "AdaGrad", "SGD")} />, <p>true makes it stable (Loss = 1)<br />false diverge (Loss {">>"} 1)</p>)}
          <ValueLine ctx={ctx6.subCtx(a => a.learningVarianceMomentum)} formGroupHtmlAttributes={hideFor(ctx6, "AdaDelta", "AdaGrad", "SGD", "MomentumSGD")} />
        </div>
        <div className="col-sm-6">
          <ValueLine ctx={ctx6.subCtx(a => a.minibatchSize)} />
          <ValueLine ctx={ctx6.subCtx(a => a.numMinibatches)} />
          <ValueLine ctx={ctx6.subCtx(a => a.bestResultFromLast)} />
          <ValueLine ctx={ctx6.subCtx(a => a.saveProgressEvery)} />
          <ValueLine ctx={ctx6.subCtx(a => a.saveValidationProgressEvery)} />
        </div>
      </div>
    </div>
  );
}

function withHelp(element: React.ReactElement<LineBaseProps>, text: React.ReactNode): React.ReactElement<any> {
  var ctx = element.props.ctx;

  var label = <LabelWithHelp ctx={ctx} text={text} />;

  return React.cloneElement(element, { labelText: label } as LineBaseProps);
}

interface LabelWithHelpProps {
  ctx: TypeContext<LineBaseProps>;
  text: React.ReactNode;
}

export function LabelWithHelp(p: LabelWithHelpProps) {

    return (
      <OverlayTrigger overlay={
        <Popover id={p.ctx.prefix + "_popper"} placement="auto" key="p">
          <h3 className="popover-header">{p.ctx.niceName()}</h3>
          <div className="popover-body">{p.text}</div>
        </Popover>}>
        <span key="s">
          {p.ctx.niceName()} <FontAwesomeIcon icon="question-circle" />
        </span>
      </OverlayTrigger>
    );
}

function hideFor(ctx: TypeContext<NeuralNetworkSettingsEntity>, ...learners: NeuralNetworkLearner[]): React.HTMLAttributes<any> | undefined {
  return ctx.value.learner && learners.contains(ctx.value.learner) ? ({ style: { opacity: 0.5 } }) : undefined;
}

interface DeviceLineProps {
  ctx: TypeContext<string | null | undefined>;
  algorithm: PredictorAlgorithmSymbol;
}

export function DeviceLine(p: DeviceLineProps) {

  const devices = useAPI(() => API.availableDevices(p.algorithm), [p.algorithm]);

  const ctx = p.ctx;
  return (
    <ValueLine ctx={ctx} comboBoxItems={(devices ?? []).map(a => ({ label: a, value: a }) as OptionItem)} valueLineType={"ComboBox"} valueHtmlAttributes={{ size: 1 }} />
  );
}
