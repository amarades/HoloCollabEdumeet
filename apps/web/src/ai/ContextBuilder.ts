/**
 * ContextBuilder.ts
 * Builds a concise AI context string from the current session state.
 * Passed to the AI assistant with every chat request for context-awareness.
 */

import type { SceneObject } from '../3d/SceneSync';

export interface Participant {
    id: string;
    name: string;
}

export interface ChatMsg {
    sender: string;
    text: string;
    timestamp?: number;
}

export function buildAIContext(
    participants: Participant[],
    sceneObjects: SceneObject[],
    chatHistory: ChatMsg[],
    meetingStartTime: number
): string {
    const durationMinutes = Math.floor((Date.now() - meetingStartTime) / 60000);
    const participantNames = participants.map((p) => p.name).join(', ') || 'No participants';

    const objectSummary = sceneObjects.slice(0, 8).map((o) =>
        `${o.type}(${o.color}) at [${o.position.map(v => v.toFixed(1)).join(',')}]${o.lockedBy ? ' [locked]' : ''}`
    ).join('; ') || 'Empty scene';

    const recentChat = chatHistory.slice(-5).map(m => `${m.sender}: ${m.text}`).join('\n') || 'No recent messages';

    return (
        `You are an AI assistant embedded in a live collaborative video conference called HoloCollabEduMeet.\n\n` +
        `Current participants (${participants.length}): ${participantNames}\n` +
        `Session duration: ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}\n` +
        `3D scene has ${sceneObjects.length} object${sceneObjects.length !== 1 ? 's' : ''}: ${objectSummary}\n` +
        `Recent chat:\n${recentChat}\n\n` +
        `When the user's request involves manipulating the 3D scene, respond with BOTH a natural language explanation ` +
        `AND a JSON block in this exact format:\n` +
        `\`\`\`scene_commands\n[{"action":"ADD_OBJECT","type":"box","position":[0,0,0],"color":"#ff0000"}]\n\`\`\``
    );
}

/**
 * Parses scene commands from an AI response string.
 * Returns an empty array if none found.
 */
export function parseSceneCommands(aiText: string): any[] {
    const match = aiText.match(/```scene_commands\s*([\s\S]*?)```/);
    if (!match) return [];
    try {
        return JSON.parse(match[1].trim());
    } catch {
        return [];
    }
}
