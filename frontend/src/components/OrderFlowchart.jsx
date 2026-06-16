import { statusLabels } from "../constants/orderStatus";
import "./OrderFlowchart.css";

const MAIN_PATH = [
  "novo",
  "aguardando_pcp",
  "aguardando_cliente",
  "aprovado",
  "em_producao",
  "enviado",
  "entregue",
];

const BRANCHES = [
  { from: "novo", to: "ajuste_necessario", side: "left", returns: "novo", label: "Ajuste" },
  { from: "aguardando_pcp", to: "recusado_pcp", side: "right", returns: null, label: "Recusado" },
  { from: "aguardando_cliente", to: "aguardando_pcp", side: "left", returns: null, label: "Rejeita data" },
  { from: "em_producao", to: "atraso_producao", side: "right", returns: "aguardando_cliente", label: "Atraso" },
  { from: "enviado", to: "entregue_divergencia", side: "right", returns: null, label: "Divergencia" },
];

function getNodeState(status, currentStatus) {
  if (status === currentStatus) return "current";

  const currentMainIdx = MAIN_PATH.indexOf(currentStatus);
  const statusMainIdx = MAIN_PATH.indexOf(status);

  // Current is on main path
  if (currentMainIdx >= 0) {
    if (statusMainIdx >= 0 && statusMainIdx < currentMainIdx) return "completed";
    if (statusMainIdx > currentMainIdx) return "future";
  }

  // Current is a branch status
  const currentBranch = BRANCHES.find((b) => b.to === currentStatus);
  if (currentBranch) {
    const branchFromIdx = MAIN_PATH.indexOf(currentBranch.from);
    if (statusMainIdx >= 0 && statusMainIdx <= branchFromIdx) return "completed";
    if (statusMainIdx > branchFromIdx) return "future";
  }

  return "future";
}

function getTerminalClass(status) {
  if (status === "cancelado" || status === "recusado_pcp") return " fc-node--terminal";
  if (status === "entregue") return " fc-node--success";
  if (status === "entregue_divergencia") return " fc-node--success";
  return "";
}

function VLine({ active, dim }) {
  const cls = active ? "fc-vline-inner fc-vline-inner--active" : dim ? "fc-vline-inner fc-vline-inner--dim" : "fc-vline-inner";
  return (
    <div className="fc-vline">
      <div className={cls} />
    </div>
  );
}

function HLine({ active, dim }) {
  const cls = active ? "fc-hline-inner fc-hline-inner--active" : dim ? "fc-hline-inner fc-hline-inner--dim" : "fc-hline-inner";
  return (
    <div className="fc-hline">
      <div className={cls} />
    </div>
  );
}

function Node({ status, currentStatus }) {
  const state = getNodeState(status, currentStatus);
  const terminal = getTerminalClass(status);
  const cls = `fc-node fc-node--${state}${terminal}`;
  return <div className={cls}>{statusLabels[status] || status}</div>;
}

export default function OrderFlowchart({ currentStatus, className = "" }) {
  const rows = [];

  MAIN_PATH.forEach((status, idx) => {
    const branch = BRANCHES.find((b) => b.from === status);
    const mainState = getNodeState(status, currentStatus);
    const isActiveConnector = mainState === "completed" || mainState === "current";

    // Main node row (with optional branch)
    if (branch) {
      const branchState = getNodeState(branch.to, currentStatus);
      const isBranchActive = branchState === "completed" || branchState === "current";

      if (branch.side === "left") {
        rows.push(
          <div className="fc-branch-row" key={`row-${status}`}>
            <div className="fc-left">
              <Node status={branch.to} currentStatus={currentStatus} />
              <HLine active={isBranchActive} />
            </div>
            <div className="fc-center">
              <Node status={status} currentStatus={currentStatus} />
            </div>
            <div className="fc-right" />
          </div>
        );
      } else {
        rows.push(
          <div className="fc-branch-row" key={`row-${status}`}>
            <div className="fc-left" />
            <div className="fc-center">
              <Node status={status} currentStatus={currentStatus} />
            </div>
            <div className="fc-right">
              <HLine active={isBranchActive} />
              <Node status={branch.to} currentStatus={currentStatus} />
            </div>
          </div>
        );
      }

      // Return label for branches that loop back
      if (branch.returns) {
        const returnTarget = statusLabels[branch.returns] || branch.returns;
        if (branch.side === "left") {
          rows.push(
            <div className="fc-branch-row" key={`ret-${branch.to}`}>
              <div className="fc-left">
                <span className="fc-loop-label">retorna a {returnTarget}</span>
              </div>
              <div className="fc-center" />
              <div className="fc-right" />
            </div>
          );
        } else {
          rows.push(
            <div className="fc-branch-row" key={`ret-${branch.to}`}>
              <div className="fc-left" />
              <div className="fc-center" />
              <div className="fc-right">
                <span className="fc-loop-label">retorna a {returnTarget}</span>
              </div>
            </div>
          );
        }
      }
    } else {
      // Simple main path node
      rows.push(
        <div className="fc-branch-row" key={`row-${status}`}>
          <div className="fc-left" />
          <div className="fc-center">
            <Node status={status} currentStatus={currentStatus} />
          </div>
          <div className="fc-right" />
        </div>
      );
    }

    // Vertical connector to next node
    if (idx < MAIN_PATH.length - 1) {
      const nextState = getNodeState(MAIN_PATH[idx + 1], currentStatus);
      const nextActive = mainState === "completed" && (nextState === "completed" || nextState === "current");
      rows.push(
        <VLine key={`vline-${idx}`} active={nextActive} />
      );
    }
  });

  // Cancelado section
  const cancelState = getNodeState("cancelado", currentStatus);
  rows.push(
    <div className="fc-cancelado-section" key="cancelado">
      <span className="fc-cancelado-label">de qualquer status ativo</span>
      <Node status="cancelado" currentStatus={currentStatus} />
    </div>
  );

  return (
    <div className={`flowchart ${className}`}>
      {rows}
    </div>
  );
}
