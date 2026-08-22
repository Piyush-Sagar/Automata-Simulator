"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { AutomataCanvas } from "../../components/editor/AutomataCanvas";
import { EditorToolbar } from "../../components/editor/EditorToolbar";
import { PropertiesPanel } from "../../components/editor/PropertiesPanel";
import { SimulationControls } from "../../components/simulator/SimulationControls";

export default function EditorPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      <ReactFlowProvider>
        {/* Top Toolbar */}
        <EditorToolbar />

        {/* Main Editor Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Graph Canvas */}
          <div className="relative flex-1">
            <AutomataCanvas />
          </div>

          {/* Right Properties Panel */}
          <PropertiesPanel />
        </div>

        {/* Bottom Simulation Controls & Trace */}
        <div className="h-64 flex-none border-t border-slate-300">
          <SimulationControls />
        </div>
      </ReactFlowProvider>
    </div>
  );
}
