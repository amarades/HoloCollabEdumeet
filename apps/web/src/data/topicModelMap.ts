/**
 * Topic → 3D Model mapping for Feature 3: Auto Content Suggestion.
 * Maps detected topic strings to preset 3D model metadata.
 */
export interface TopicModel {
    url: string;
    label: string;
    description: string;
}

export const topicModelMap: Record<string, TopicModel> = {
    heart: {
        url: '/api/models/heart.glb',
        label: 'Human Heart',
        description: 'Detailed 3D model of the human heart showing all four chambers.',
    },
    cardiac: {
        url: '/api/models/heart.glb',
        label: 'Human Heart',
        description: 'Cardiac anatomy and function.',
    },
    brain: {
        url: '/api/models/brain.glb',
        label: 'Human Brain',
        description: 'Complete 3D brain model with labelled regions.',
    },
    neuron: {
        url: '/api/models/brain.glb',
        label: 'Human Brain',
        description: 'Neuroscience and brain structure.',
    },
    dna: {
        url: '/api/models/dna.glb',
        label: 'DNA Double Helix',
        description: 'DNA structure showing base pairs and double helix formation.',
    },
    genetics: {
        url: '/api/models/dna.glb',
        label: 'DNA Double Helix',
        description: 'Genetics and molecular biology.',
    },
    'solar system': {
        url: '/api/models/solar_system.glb',
        label: 'Solar System',
        description: 'Scaled model of all planets orbiting the Sun.',
    },
    planet: {
        url: '/api/models/solar_system.glb',
        label: 'Solar System',
        description: 'Planetary science and astronomy.',
    },
    atom: {
        url: '/api/models/atom.glb',
        label: 'Atom Model',
        description: 'Bohr model of the atom with electron shells.',
    },
    chemistry: {
        url: '/api/models/atom.glb',
        label: 'Atom Model',
        description: 'Atomic structure and chemistry fundamentals.',
    },
    'binary tree': {
        url: '/api/models/binary_tree.glb',
        label: 'Binary Tree',
        description: 'Recursive binary search tree data structure.',
    },
    tree: {
        url: '/api/models/binary_tree.glb',
        label: 'Binary Tree',
        description: 'Tree data structure visualization.',
    },
    recursion: {
        url: '/api/models/binary_tree.glb',
        label: 'Binary Tree',
        description: 'Recursive algorithms and tree structures.',
    },
    cell: {
        url: '/api/models/cell.glb',
        label: 'Animal Cell',
        description: 'Cross-section of an animal cell with organelles.',
    },
    biology: {
        url: '/api/models/cell.glb',
        label: 'Animal Cell',
        description: 'Cell biology and organelle functions.',
    },
    volcano: {
        url: '/api/models/volcano.glb',
        label: 'Volcano',
        description: 'Cross-section of a stratovolcano showing magma chambers.',
    },
    geology: {
        url: '/api/models/volcano.glb',
        label: 'Volcano',
        description: 'Geological processes and tectonic activity.',
    },
    crystal: {
        url: '/api/models/crystal.glb',
        label: 'Crystal Structure',
        description: 'Crystalline lattice structure of common minerals.',
    },
    mineral: {
        url: '/api/models/crystal.glb',
        label: 'Crystal Structure',
        description: 'Mineralogy and crystal formation.',
    },
};

/**
 * Find the best matching model for a detected topic.
 * Looks for exact key match first, then partial substring match.
 */
export function findModelForTopic(topic: string): TopicModel | null {
    const lower = topic.toLowerCase();
    // Exact match
    if (topicModelMap[lower]) return topicModelMap[lower];
    // Partial match
    for (const [key, model] of Object.entries(topicModelMap)) {
        if (lower.includes(key) || key.includes(lower)) {
            return model;
        }
    }
    return null;
}
