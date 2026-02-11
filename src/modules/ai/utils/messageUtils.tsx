import type { GeneratedShape, Message, ShapeType } from "../types/chat.type";

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format message content
 */
export const formatMessageContent = (content: string): string => {
  return content.trim();
};

/**
 * Check if message is from user
 */
export const isUserMessage = (message: Message): boolean => {
  return message.role === "user";
};

/**
 * Check if message is from assistant
 */
export const isAssistantMessage = (message: Message): boolean => {
  return message.role === "assistant";
};

/**
 * Get last message
 */
export const getLastMessage = (messages: Message[]): Message | null => {
  return messages.length > 0 ? messages[messages.length - 1] : null;
};

/**
 * Detect shape generation intent from message
 */
export const detectShapeGenerationIntent = (
  content: string
): {
  isShapeRequest: boolean;
  shapeType?: ShapeType;
  keywords: string[];
} => {
  const lowercaseContent = content.toLowerCase();

  const shapeKeywords: Record<ShapeType, string[]> = {
    robotic_arm: ["robot", "arm", "manipulator", "gripper", "dof", "robotic"],
    car: ["car", "vehicle", "automobile", "sedan", "sports car", "wheels"],
    furniture: ["chair", "table", "desk", "furniture", "sofa", "cabinet"],
    industrial: ["warehouse", "crane", "conveyor", "machinery", "industrial"],
    generic: ["cube", "cylinder", "sphere", "mesh", "shape", "geometry", "box"],
  };

  for (const [type, keywords] of Object.entries(shapeKeywords)) {
    const matchedKeywords = keywords.filter((keyword) =>
      lowercaseContent.includes(keyword)
    );

    if (matchedKeywords.length > 0) {
      return {
        isShapeRequest: true,
        shapeType: type as ShapeType,
        keywords: matchedKeywords,
      };
    }
  }

  return { isShapeRequest: false, keywords: [] };
};

/**
 * Generate shape data based on detected type
 */
export const generateShapeData = (shapeType: ShapeType): GeneratedShape => {
  const shapeConfigs: Record<
    ShapeType,
    Omit<GeneratedShape, "id" | "createdAt">
  > = {
    robotic_arm: {
      type: "robotic_arm",
      name: "6-DOF Robotic Arm",
      description: "Industrial robotic arm with gripper mechanism",
      hasSimulation: true,
      geometry: {
        joints: 6,
        dof: 6,
        reach: 850,
        payload: 5,
        gripper: true,
        jointLimits: [-180, 180],
      },
    },
    car: {
      type: "car",
      name: "Sports Car Model",
      description: "Aerodynamic sports car with interactive components",
      hasSimulation: true,
      geometry: {
        wheels: 4,
        doors: 2,
        length: 4500,
        width: 1800,
        height: 1300,
        wheelBase: 2700,
      },
    },
    furniture: {
      type: "furniture",
      name: "Modern Office Chair",
      description: "Ergonomic office furniture with adjustable features",
      hasSimulation: false,
      geometry: {
        type: "ergonomic",
        adjustable: true,
        materials: ["fabric", "metal", "plastic"],
        seatHeight: [450, 550],
      },
    },
    industrial: {
      type: "industrial",
      name: "Industrial Machinery",
      description: "Complex industrial automation system",
      hasSimulation: true,
      geometry: {
        components: 8,
        motorized: true,
        automation: "full",
        capacity: 1000,
      },
    },
    generic: {
      type: "generic",
      name: "Geometric Shape",
      description: "Basic 3D geometric mesh",
      hasSimulation: false,
      geometry: {
        vertices: 1000,
        faces: 998,
        edges: 1500,
        type: "mesh",
      },
    },
  };

  const config = shapeConfigs[shapeType];

  return {
    id: generateId(),
    ...config,
    createdAt: new Date(),
  };
};
