

type CategoryScore = {
	category: string;
	score: number;
};

export const calculateRanking = (ranking: string) => {
	console.log("raw", ranking);
	try {
		const match = ranking.match(/```json\n([\s\S]*?)\n```/);
		if (!match || match.length < 2) {
			throw new Error("Invalid format");
		}

		const jsonString = match[1];
		const parsedData: CategoryScore[] = JSON.parse(jsonString!);
		const avgScore = parsedData.reduce((total, item) => total + item.score, 0) / parsedData.length;
		return { parsedData, avgScore };
	} catch (error) {
		console.error("Error converting string:", error);
		return { parsedData: [], avgScore: 0 };
	}
}