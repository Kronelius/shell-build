import PipelineBoard from '../components/PipelineBoard';

export default function Pipeline() {
  return (
    <>
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-head-title">Pipeline</h1>
          <p className="page-head-subtitle">
            Deals in flight. Drag contacts between stages to advance them.
          </p>
        </div>
      </div>
      <PipelineBoard />
    </>
  );
}
