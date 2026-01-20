import { Settings } from "lucide-react";
import { SimulationParameters } from "../types/simulation.type";

interface ParameterPanelProps {
  parameters: SimulationParameters;
  onChange: (parameters: SimulationParameters) => void;
  disabled?: boolean;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  const handleChange = (key: keyof SimulationParameters, value: any) => {
    onChange({ ...parameters, [key]: value });
  };

  return (
    <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
          <Settings className="w-5 h-5 text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">
          Simulation Parameters
        </h3>
      </div>

      <div className="space-y-5">
        {/* Time Step */}
        <InputGroup
          label="Time Step (s)"
          type="number"
          value={parameters.timeStep}
          onChange={(v) => handleChange("timeStep", parseFloat(v))}
          step="0.0001"
          disabled={disabled}
        />

        {/* Max Iterations */}
        <InputGroup
          label="Max Iterations"
          type="number"
          value={parameters.maxIterations}
          onChange={(v) => handleChange("maxIterations", parseInt(v))}
          disabled={disabled}
        />

        {/* Convergence Criteria */}
        <InputGroup
          label="Convergence Criteria"
          type="number"
          value={parameters.convergenceCriteria}
          onChange={(v) => handleChange("convergenceCriteria", parseFloat(v))}
          step="0.000001"
          disabled={disabled}
        />

        {/* Turbulence Model */}
        <SelectGroup
          label="Turbulence Model"
          value={parameters.turbulenceModel}
          onChange={(v) => handleChange("turbulenceModel", v)}
          options={[
            { value: "k-epsilon", label: "k-epsilon" },
            { value: "k-omega", label: "k-omega" },
            { value: "SST", label: "SST" },
            { value: "LES", label: "LES" },
            { value: "DNS", label: "DNS" },
          ]}
          disabled={disabled}
        />

        {/* Mesh Quality */}
        <SelectGroup
          label="Mesh Quality"
          value={parameters.meshQuality}
          onChange={(v) => handleChange("meshQuality", v)}
          options={[
            { value: "coarse", label: "Coarse (Fast)" },
            { value: "medium", label: "Medium (Balanced)" },
            { value: "fine", label: "Fine (Accurate)" },
          ]}
          disabled={disabled}
        />

        {/* Solver Type */}
        <SelectGroup
          label="Solver Type"
          value={parameters.solverType}
          onChange={(v) => handleChange("solverType", v)}
          options={[
            { value: "steady", label: "Steady State" },
            { value: "transient", label: "Transient" },
          ]}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

interface InputGroupProps {
  label: string;
  type: string;
  value: number;
  onChange: (value: string) => void;
  step?: string;
  disabled?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({
  label,
  type,
  value,
  onChange,
  step,
  disabled,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 disabled:bg-neutral-900 disabled:cursor-not-allowed transition-all"
      />
    </div>
  );
};

interface SelectGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

const SelectGroup: React.FC<SelectGroupProps> = ({
  label,
  value,
  onChange,
  options,
  disabled,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 disabled:bg-neutral-900 disabled:cursor-not-allowed transition-all"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
