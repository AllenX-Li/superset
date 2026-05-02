// biome-ignore lint/suspicious/noExplicitAny: stub — callers access typed properties on resolved value
const notAvailable = (..._args: any[]): Promise<any> =>
	Promise.reject(new Error("Not available in local mode"));

export const apiTrpcClient = {
	automation: {
		create: { mutate: notAvailable },
		update: { mutate: notAvailable },
		setEnabled: { mutate: notAvailable },
		runNow: { mutate: notAvailable },
		delete: { mutate: notAvailable },
		setPrompt: { mutate: notAvailable },
	},
	chat: {
		createSession: { mutate: notAvailable },
		getModels: { query: notAvailable },
	},
	task: { byId: { query: notAvailable } },
	support: { sendMigrationReport: { mutate: notAvailable } },
	v2Project: { delete: { mutate: notAvailable } },
};
