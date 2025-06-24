import { relations } from "drizzle-orm/relations";
import { bazaarVidCustomComponentJob, bazaarVidComponentError, bazaarVidUser, bazaarVidFeedback, bazaarVidProject, bazaarVidScenePlan, bazaarVidMessage, bazaarVidAnimationDesignBrief, bazaarVidSceneSpecs, bazaarVidEmailSubscriber, bazaarVidScene, bazaarVidSceneIteration, bazaarVidComponentTestCase, bazaarVidComponentEvaluationMetric, bazaarVidProjectMemory, bazaarVidSharedVideo, bazaarVidPatch, bazaarVidImageAnalysis, bazaarVidAccount } from "./schema";

export const bazaarVidComponentErrorRelations = relations(bazaarVidComponentError, ({one}) => ({
	bazaarVidCustomComponentJob: one(bazaarVidCustomComponentJob, {
		fields: [bazaarVidComponentError.jobId],
		references: [bazaarVidCustomComponentJob.id]
	}),
}));

export const bazaarVidCustomComponentJobRelations = relations(bazaarVidCustomComponentJob, ({one, many}) => ({
	bazaarVidComponentErrors: many(bazaarVidComponentError),
	bazaarVidAnimationDesignBriefs: many(bazaarVidAnimationDesignBrief),
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidCustomComponentJob.projectId],
		references: [bazaarVidProject.id]
	}),
	bazaarVidMessage: one(bazaarVidMessage, {
		fields: [bazaarVidCustomComponentJob.statusMessageId],
		references: [bazaarVidMessage.id]
	}),
}));

export const bazaarVidFeedbackRelations = relations(bazaarVidFeedback, ({one}) => ({
	bazaarVidUser: one(bazaarVidUser, {
		fields: [bazaarVidFeedback.userId],
		references: [bazaarVidUser.id]
	}),
}));

export const bazaarVidUserRelations = relations(bazaarVidUser, ({many}) => ({
	bazaarVidFeedbacks: many(bazaarVidFeedback),
	bazaarVidSceneSpecs: many(bazaarVidSceneSpecs),
	bazaarVidEmailSubscribers: many(bazaarVidEmailSubscriber),
	bazaarVidProjects: many(bazaarVidProject),
	bazaarVidSharedVideos: many(bazaarVidSharedVideo),
	bazaarVidAccounts: many(bazaarVidAccount),
}));

export const bazaarVidScenePlanRelations = relations(bazaarVidScenePlan, ({one}) => ({
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidScenePlan.projectId],
		references: [bazaarVidProject.id]
	}),
	bazaarVidMessage: one(bazaarVidMessage, {
		fields: [bazaarVidScenePlan.messageId],
		references: [bazaarVidMessage.id]
	}),
}));

export const bazaarVidProjectRelations = relations(bazaarVidProject, ({one, many}) => ({
	bazaarVidScenePlans: many(bazaarVidScenePlan),
	bazaarVidAnimationDesignBriefs: many(bazaarVidAnimationDesignBrief),
	bazaarVidSceneSpecs: many(bazaarVidSceneSpecs),
	bazaarVidSceneIterations: many(bazaarVidSceneIteration),
	bazaarVidCustomComponentJobs: many(bazaarVidCustomComponentJob),
	bazaarVidScenes: many(bazaarVidScene),
	bazaarVidProjectMemories: many(bazaarVidProjectMemory),
	bazaarVidUser: one(bazaarVidUser, {
		fields: [bazaarVidProject.userId],
		references: [bazaarVidUser.id]
	}),
	bazaarVidSharedVideos: many(bazaarVidSharedVideo),
	bazaarVidPatches: many(bazaarVidPatch),
	bazaarVidMessages: many(bazaarVidMessage),
	bazaarVidImageAnalyses: many(bazaarVidImageAnalysis),
}));

export const bazaarVidMessageRelations = relations(bazaarVidMessage, ({one, many}) => ({
	bazaarVidScenePlans: many(bazaarVidScenePlan),
	bazaarVidSceneIterations: many(bazaarVidSceneIteration),
	bazaarVidCustomComponentJobs: many(bazaarVidCustomComponentJob),
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidMessage.projectId],
		references: [bazaarVidProject.id]
	}),
}));

export const bazaarVidAnimationDesignBriefRelations = relations(bazaarVidAnimationDesignBrief, ({one}) => ({
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidAnimationDesignBrief.projectId],
		references: [bazaarVidProject.id]
	}),
	bazaarVidCustomComponentJob: one(bazaarVidCustomComponentJob, {
		fields: [bazaarVidAnimationDesignBrief.componentJobId],
		references: [bazaarVidCustomComponentJob.id]
	}),
}));

export const bazaarVidSceneSpecsRelations = relations(bazaarVidSceneSpecs, ({one}) => ({
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidSceneSpecs.projectId],
		references: [bazaarVidProject.id]
	}),
	bazaarVidUser: one(bazaarVidUser, {
		fields: [bazaarVidSceneSpecs.createdBy],
		references: [bazaarVidUser.id]
	}),
}));

export const bazaarVidEmailSubscriberRelations = relations(bazaarVidEmailSubscriber, ({one}) => ({
	bazaarVidUser: one(bazaarVidUser, {
		fields: [bazaarVidEmailSubscriber.userId],
		references: [bazaarVidUser.id]
	}),
}));

export const bazaarVidSceneIterationRelations = relations(bazaarVidSceneIteration, ({one}) => ({
	bazaarVidScene: one(bazaarVidScene, {
		fields: [bazaarVidSceneIteration.sceneId],
		references: [bazaarVidScene.id]
	}),
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidSceneIteration.projectId],
		references: [bazaarVidProject.id]
	}),
	bazaarVidMessage: one(bazaarVidMessage, {
		fields: [bazaarVidSceneIteration.messageId],
		references: [bazaarVidMessage.id]
	}),
}));

export const bazaarVidSceneRelations = relations(bazaarVidScene, ({one, many}) => ({
	bazaarVidSceneIterations: many(bazaarVidSceneIteration),
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidScene.projectId],
		references: [bazaarVidProject.id]
	}),
}));

export const bazaarVidComponentEvaluationMetricRelations = relations(bazaarVidComponentEvaluationMetric, ({one}) => ({
	bazaarVidComponentTestCase: one(bazaarVidComponentTestCase, {
		fields: [bazaarVidComponentEvaluationMetric.testCaseId],
		references: [bazaarVidComponentTestCase.id]
	}),
}));

export const bazaarVidComponentTestCaseRelations = relations(bazaarVidComponentTestCase, ({many}) => ({
	bazaarVidComponentEvaluationMetrics: many(bazaarVidComponentEvaluationMetric),
}));

export const bazaarVidProjectMemoryRelations = relations(bazaarVidProjectMemory, ({one}) => ({
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidProjectMemory.projectId],
		references: [bazaarVidProject.id]
	}),
}));

export const bazaarVidSharedVideoRelations = relations(bazaarVidSharedVideo, ({one}) => ({
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidSharedVideo.projectId],
		references: [bazaarVidProject.id]
	}),
	bazaarVidUser: one(bazaarVidUser, {
		fields: [bazaarVidSharedVideo.userId],
		references: [bazaarVidUser.id]
	}),
}));

export const bazaarVidPatchRelations = relations(bazaarVidPatch, ({one}) => ({
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidPatch.projectId],
		references: [bazaarVidProject.id]
	}),
}));

export const bazaarVidImageAnalysisRelations = relations(bazaarVidImageAnalysis, ({one}) => ({
	bazaarVidProject: one(bazaarVidProject, {
		fields: [bazaarVidImageAnalysis.projectId],
		references: [bazaarVidProject.id]
	}),
}));

export const bazaarVidAccountRelations = relations(bazaarVidAccount, ({one}) => ({
	bazaarVidUser: one(bazaarVidUser, {
		fields: [bazaarVidAccount.userId],
		references: [bazaarVidUser.id]
	}),
}));