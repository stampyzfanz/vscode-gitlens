import { MarkdownString, ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Autolink } from '../../annotations/autolinks';
import { AutolinkType } from '../../config';
import { GitUri } from '../../git/gitUri';
import { GitFile, IssueOrPullRequest, IssueOrPullRequestType } from '../../git/models';
import { fromNow } from '../../system/date';
import { ViewsWithCommits } from '../viewBase';
import { ContextValues, ViewNode } from './viewNode';

export interface FilesQueryResults {
	label: string;
	files: GitFile[] | undefined;
	filtered?: {
		filter: 'left' | 'right';
		files: GitFile[];
	};
}

export class AutolinkedItemNode extends ViewNode<ViewsWithCommits> {
	constructor(
		view: ViewsWithCommits,
		parent: ViewNode,
		public readonly repoPath: string,
		public readonly item: Autolink | IssueOrPullRequest,
	) {
		super(GitUri.fromRepoPath(repoPath), view, parent);
	}

	override toClipboard(): string {
		return this.item.url;
	}

	override get id(): string {
		return `${this.parent!.id!}:item(${this.item.id})`;
	}

	getChildren(): ViewNode[] {
		return [];
	}

	getTreeItem(): TreeItem {
		if (!isIssueOrPullRequest(this.item)) {
			const { provider } = this.item;

			const item = new TreeItem(`${this.item.prefix}${this.item.id}`, TreeItemCollapsibleState.None);
			item.description = provider?.name ?? 'Custom';
			item.iconPath = new ThemeIcon(
				this.item.type == null
					? 'link'
					: this.item.type === AutolinkType.PullRequest
					? 'git-pull-request'
					: 'issues',
			);
			item.contextValue = ContextValues.AutolinkedItem;
			item.tooltip = new MarkdownString(
				`${
					this.item.description
						? `Autolinked ${this.item.description}`
						: `${
								this.item.type == null
									? 'Autolinked'
									: this.item.type === AutolinkType.PullRequest
									? 'Autolinked Pull Request'
									: 'Autolinked Issue'
						  } ${this.item.prefix}${this.item.id}`
				} \\\n[${this.item.url}](${this.item.url}${this.item.title != null ? ` "${this.item.title}"` : ''})`,
			);
			return item;
		}

		const relativeTime = fromNow(this.item.closedDate ?? this.item.date);

		const item = new TreeItem(`${this.item.id}: ${this.item.title}`, TreeItemCollapsibleState.None);
		item.description = relativeTime;
		item.iconPath = IssueOrPullRequest.getThemeIcon(this.item);
		item.contextValue =
			this.item.type === IssueOrPullRequestType.PullRequest
				? ContextValues.PullRequest
				: ContextValues.AutolinkedIssue;

		const linkTitle = ` "Open ${
			this.item.type === IssueOrPullRequestType.PullRequest ? 'Pull Request' : 'Issue'
		} \\#${this.item.id} on ${this.item.provider.name}"`;
		const tooltip = new MarkdownString(
			`${IssueOrPullRequest.getMarkdownIcon(this.item)} [**${this.item.title.trim()}**](${
				this.item.url
			}${linkTitle}) \\\n[#${this.item.id}](${this.item.url}${linkTitle}) was ${
				this.item.closed ? 'closed' : 'opened'
			} ${relativeTime}`,
			true,
		);
		tooltip.supportHtml = true;
		tooltip.isTrusted = true;

		item.tooltip = tooltip;

		return item;
	}
}

function isIssueOrPullRequest(item: Autolink | IssueOrPullRequest): item is IssueOrPullRequest {
	return 'closed' in item && typeof item.closed === 'boolean';
}
