export declare enum SkillLevel {
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED",
    EXPERT = "EXPERT"
}
export declare class Skill {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    isActive: boolean;
    categoryId: string | null;
    category: any | null;
    level: SkillLevel;
    userId: string;
    user: any;
    experience: string;
    createdAt: Date;
    updatedAt: Date;
}
