import React, { useState, useEffect } from 'react';
import { X, BarChart2, Play } from 'lucide-react';
import { SocketManager } from '../../../realtime/SocketManager';

interface QuizPanelProps {
    onClose: () => void;
    socket: SocketManager | null;
    user: any;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({ onClose, socket, user }) => {
    // Mode: 'CREATE', 'LIVE', 'VOTE'
    const [mode, setMode] = useState<'CREATE' | 'LIVE' | 'VOTE'>('CREATE');

    // Quiz Data
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [activeQuiz, setActiveQuiz] = useState<any>(null);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    const isHost = true; // For now everyone is host for testing. In prod, check user.role

    useEffect(() => {
        if (!socket) return;

        socket.onQuizUpdate = (quiz: any) => {
            console.log('Quiz Update:', quiz);
            setActiveQuiz(quiz);

            if (quiz && quiz.active) {
                if (isHost) {
                    setMode('LIVE');
                } else {
                    setMode('VOTE');
                }
            } else {
                setMode('CREATE');
            }
        };

        return () => {
            if (socket) socket.onQuizUpdate = null;
        };
    }, [socket, isHost]);

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOpts = [...options];
        newOpts[index] = value;
        setOptions(newOpts);
    };

    const startQuiz = () => {
        if (!socket) return;
        socket.emit('QUIZ_ACTION', {
            sub_action: 'START',
            question,
            options: options.filter(o => o.trim() !== '')
        });
        setMode('LIVE');
    };

    const endQuiz = () => {
        if (!socket) return;
        socket.emit('QUIZ_ACTION', { sub_action: 'END' });
        setMode('CREATE');
        setActiveQuiz(null);
    };

    const submitVote = (index: number) => {
        if (!socket) return;
        setSelectedOption(index);
        socket.emit('QUIZ_ACTION', {
            sub_action: 'VOTE',
            user: user.name,
            option_index: index
        });
    };

    const getResults = () => {
        if (!activeQuiz || !activeQuiz.votes) return [];
        const counts = new Array(activeQuiz.options.length).fill(0);
        Object.values(activeQuiz.votes).forEach((voteIdx: any) => {
            if (typeof voteIdx === 'number' && voteIdx < counts.length) {
                counts[voteIdx]++;
            }
        });
        return counts;
    };

    return (
        <div className="absolute inset-4 md:inset-y-10 md:right-10 md:left-auto md:w-[400px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-gray-900 font-semibold text-lg flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    Polls
                </h2>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white">
                {mode === 'CREATE' && (
                    <div className="flex flex-col gap-6 relative z-10">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700">
                                Question
                            </label>
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                className="bg-white border border-gray-300 rounded-xl p-3 text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                placeholder="What would you like to ask?"
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-medium text-gray-700">
                                Options
                            </label>
                            {options.map((opt, i) => (
                                <input
                                    key={i}
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleOptionChange(i, e.target.value)}
                                    className="bg-white border border-gray-300 rounded-xl p-3 text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                    placeholder={`Option ${i + 1}`}
                                />
                            ))}
                            <button onClick={handleAddOption} className="text-sm font-medium text-primary hover:text-primary-hover text-left mt-2">
                                + Add another option
                            </button>
                        </div>

                        <button
                            onClick={startQuiz}
                            className="mt-4 bg-primary text-white hover:bg-primary-hover font-semibold py-3.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-md w-full"
                        >
                            <Play className="w-4 h-4 fill-white" />
                            Launch Poll
                        </button>
                    </div>
                )}

                {(mode === 'LIVE' || mode === 'VOTE') && activeQuiz && (
                    <div className="flex flex-col gap-6 relative z-10">
                        <div>
                            <span className="inline-block px-2.5 py-1 bg-green-100 text-green-700 font-semibold text-xs rounded-full mb-3">Live</span>
                            <h3 className="text-xl text-gray-900 font-semibold">{activeQuiz.question}</h3>
                        </div>

                        <div className="flex flex-col gap-3">
                            {activeQuiz.options.map((opt: string, i: number) => {
                                const results = getResults();
                                const totalVotes = Object.keys(activeQuiz.votes || {}).length;
                                const percentage = totalVotes > 0 ? (results[i] / totalVotes) * 100 : 0;
                                const isSelected = selectedOption === i;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => submitVote(i)}
                                        disabled={isHost}
                                        className={`relative overflow-hidden p-4 rounded-xl border transition-all text-left shadow-sm
                                            ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white'}
                                        `}
                                    >
                                        {/* Progress Bar Background */}
                                        {(isHost || selectedOption !== null) && (
                                            <div
                                                className={`absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out opacity-20 ${isSelected ? 'bg-primary' : 'bg-gray-400'}`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        )}

                                        <div className="relative flex justify-between items-center z-10">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary' : 'border-gray-300'}`}>
                                                    {isSelected && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                                </div>
                                                <span className={isSelected ? 'text-primary font-semibold' : 'text-gray-700 font-medium'}>{opt}</span>
                                            </div>
                                            {(isHost || selectedOption !== null) && (
                                                <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-gray-500'}`}>{Math.round(percentage)}%</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="text-center text-gray-500 text-sm font-medium">
                            {Object.keys(activeQuiz.votes || {}).length} responses
                        </div>

                        {isHost && (
                            <button
                                onClick={endQuiz}
                                className="mt-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3.5 px-4 rounded-full transition-all w-full border border-red-100"
                            >
                                End Poll
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
