import { IUser, IChallenge, TreeNode } from "../types";
import chalk from "chalk";

export class ProgressView {
    constructor(
        private userState: IUser,
        private challenges: IChallenge[],
    ) {}

    buildProgressTree(): TreeNode {
        const completedChallenges = this.userState.challenges
            .filter(c => c.status === "success")
            .map(c => ({
                challenge: this.challenges.find(ch => ch.name === c.challengeName),
                completion: c
            }))
            .filter(c => c.challenge);

        const points = this.calculatePoints(completedChallenges);
        const completionRate = (completedChallenges.length / this.challenges.filter(c => c.enabled).length * 100).toFixed(1);

        // Create stats node
        const statsNode: TreeNode = {
            type: "header",
            label: "Progress Stats",
            name: "stats",
            children: [], // Stats node doesn't need children
            message: this.buildStatsMessage(points, completionRate)
        };

        // Create completed challenges node with all completed challenges as children
        const challengeNodes: TreeNode[] = completedChallenges.map(({ challenge, completion }) => {
            const children: TreeNode[] = [];
            
            // Add gas report node as a child if available
            if (completion.gasReport && completion.gasReport.length > 0) {
                children.push(this.buildGasReportNode(completion.gasReport));
            }

            return {
                type: "header",
                label: challenge!.label,
                name: challenge!.name,
                children,
                message: this.buildChallengeMessage(challenge!, completion)
            };
        });

        const completedNode: TreeNode = {
            type: "header",
            label: "Completed Challenges",
            name: "completed",
            children: challengeNodes,
            message: `You have completed ${completedChallenges.length} challenges`
        };

        // Main progress menu
        const progressMenu: TreeNode = {
            type: "header",
            label: "Progress Menu",
            name: "progress-menu",
            children: [statsNode, completedNode],
            message: "View your progress"
        };

        return progressMenu;
    }

    private calculatePoints(completedChallenges: Array<{ challenge: IChallenge | undefined, completion: any }>): number {
        const pointsPerLevel = [100, 150, 225, 300, 400, 500];
        return completedChallenges
            .filter(c => c.challenge)
            .reduce((total, { challenge }) => {
                const points = pointsPerLevel[challenge!.level - 1] || 100;
                return total + points;
            }, 0);
    }

    private buildStatsMessage(points: number, completionRate: string): string {
        return `${chalk.bold("Your Stats")}

Address: ${chalk.blue(this.userState.ens || this.userState.address)}
${chalk.yellow(`Points Earned: ${points.toLocaleString()}`)}

Challenge Progress
Total Challenges: ${chalk.blue(this.challenges.filter(c => c.enabled).length)}
Completed: ${chalk.blue(`${this.userState.challenges.filter(c => c.status === "success").length} (${completionRate}%)`)}
`;
    }

    private buildChallengeMessage(challenge: IChallenge, completion: any): string {
        let message = `${chalk.bold(challenge.label)}\n\n`;
        message += `Description: ${challenge.description}\n\n`;
        message += `Completion Date: ${chalk.blue(new Date(completion.timestamp).toLocaleString())}\n`;
        
        if (completion.contractAddress) {
            message += `Contract Address: ${chalk.blue(completion.contractAddress)}\n`;
            message += `Network: ${chalk.blue(completion.network)}\n`;
        }

        return message;
    }

    private buildGasReportNode(gasReport: Array<{ functionName: string; gasUsed: number }>): TreeNode {
        const gasInfo = gasReport.sort((a, b) => b.gasUsed - a.gasUsed);
        const totalGas = gasInfo.reduce((sum, g) => sum + g.gasUsed, 0);

        // Create individual gas entry nodes
        const nodes: TreeNode[] = gasInfo.map(({ functionName, gasUsed }) => ({
            type: "header",
            label: `${functionName}: ${chalk.yellow(`${gasUsed.toLocaleString()} gas`)}`,
            name: `gas-entry-${functionName}`,
            children: [],
            disabled: true,
            message: `Function: ${functionName}\nGas Used: ${gasUsed.toLocaleString()} (${((gasUsed / totalGas) * 100).toFixed(1)}% of total)`
        }));

        return {
            type: "header",
            label: "View Gas Report",
            name: "gas-report",
            children: nodes,
            message: `Total Gas Used: ${chalk.bold(totalGas.toLocaleString())}\nDetailed breakdown:`
        };
    }
} 