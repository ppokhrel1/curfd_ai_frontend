import {
    Activity,
    Box,
    CheckCircle2,
    Database,
    FileArchive,
    Loader2,
    Search
} from "lucide-react";
import React, { useEffect, useState } from "react";

export type ImportStage = 
    | 'idle'
    | 'reading'
    | 'extracting'
    | 'analyzing'
    | 'registering'
    | 'finalizing'
    | 'complete';

interface ModelImportOverlayProps {
    isOpen: boolean;
    stage: ImportStage;
    fileName: string;
}

export const ModelImportOverlay: React.FC<ModelImportOverlayProps> = ({
    isOpen,
    stage,
    fileName
}) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            setProgress(0);
            return;
        }

        // Simulate smooth progress within stages
        const interval = setInterval(() => {
            setProgress(prev => {
                const target = getTargetProgress(stage);
                if (prev < target) return prev + 0.5;
                return prev;
            });
        }, 30);

        return () => clearInterval(interval);
    }, [isOpen, stage]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Background Blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" />

            {/* Core Card */}
            <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                {/* Visual Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-6">
                        {/* Outer Glow */}
                        <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                        
                        {/* Animated Icon Ring */}
                        <div className="relative w-20 h-20 bg-neutral-800 border border-neutral-700 rounded-2xl flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
                            {stage === 'complete' ? (
                                <CheckCircle2 className="w-10 h-10 text-green-400 animate-in zoom-in duration-300" />
                            ) : (
                                <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
                            )}
                        </div>

                        {/* Overlapping Stage Icon */}
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-neutral-900 border border-neutral-700 rounded-lg flex items-center justify-center shadow-lg">
                            {getStageIcon(stage)}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white tracking-tight text-center">
                        Unified Model Importer
                    </h3>
                    <p className="text-neutral-500 text-sm mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Mission Log
                        </span>
                        {fileName}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2">
                        <span>{getStageLabel(stage)}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden p-[1px]">
                        <div 
                            className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_-2px_rgba(74,222,128,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Technical Log */}
                <div className="bg-black/40 border border-neutral-800/50 rounded-xl p-4">
                    <div className="space-y-2.5">
                        <LogEntry 
                            active={stage === 'reading' || stage === 'extracting'} 
                            complete={progress > 30} 
                            label="Decompressing ZIP Archive" 
                        />
                        <LogEntry 
                            active={stage === 'analyzing'} 
                            complete={progress > 60} 
                            label="SDF Structural Analysis" 
                        />
                        <LogEntry 
                            active={stage === 'registering'} 
                            complete={progress > 85} 
                            label="Backend Mission Registration" 
                        />
                        <LogEntry 
                            active={stage === 'finalizing' || stage === 'complete'} 
                            complete={progress >= 100} 
                            label="Virtualizing Model Buffer" 
                        />
                    </div>
                </div>

                {/* Footer Deco */}
                <div className="mt-8 pt-6 border-t border-neutral-800/50 flex items-center justify-between text-[9px] text-neutral-600 font-mono uppercase tracking-tighter">
                    <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-green-500/40" />
                        <span>System Stable</span>
                    </div>
                    <span>IO-LATENCY: 12ms</span>
                </div>
            </div>
        </div>
    );
};

const LogEntry: React.FC<{ active: boolean; complete: boolean; label: string }> = ({ active, complete, label }) => (
    <div className={`flex items-center gap-3 transition-opacity duration-300 ${!active && !complete ? 'opacity-20' : 'opacity-100'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${complete ? 'bg-green-500' : active ? 'bg-green-400 animate-pulse' : 'bg-neutral-700'}`} />
        <span className={`text-[11px] ${complete ? 'text-neutral-400 line-through decoration-neutral-700' : active ? 'text-white font-medium' : 'text-neutral-600'}`}>
            {label}
        </span>
    </div>
);

const getTargetProgress = (stage: ImportStage) => {
    switch (stage) {
        case 'idle': return 0;
        case 'reading': return 20;
        case 'extracting': return 40;
        case 'analyzing': return 65;
        case 'registering': return 85;
        case 'finalizing': return 95;
        case 'complete': return 100;
        default: return 0;
    }
};

const getStageLabel = (stage: ImportStage) => {
    switch (stage) {
        case 'idle': return 'Awaiting signal...';
        case 'reading': return 'Reading Buffer...';
        case 'extracting': return 'Extracting Meshes...';
        case 'analyzing': return 'Decomposing Parts...';
        case 'registering': return 'Linking Backend...';
        case 'finalizing': return 'Finalizing Sync...';
        case 'complete': return 'Mission Registered';
        default: return 'Processing...';
    }
};

const getStageIcon = (stage: ImportStage) => {
    switch (stage) {
        case 'reading': return <Activity className="w-3.5 h-3.5 text-blue-400" />;
        case 'extracting': return <FileArchive className="w-3.5 h-3.5 text-purple-400" />;
        case 'analyzing': return <Search className="w-3.5 h-3.5 text-amber-400" />;
        case 'registering': return <Database className="w-3.5 h-3.5 text-green-400" />;
        case 'complete': return <Box className="w-3.5 h-3.5 text-green-400" />;
        default: return <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />;
    }
};
