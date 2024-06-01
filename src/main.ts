import { Plugin, SettingTab, PluginSettingTab, App } from 'obsidian';
import { around } from 'monkey-around';
import { loadAnnotations, saveAnnotations } from './db';

interface PluginAnnotation {
	[pluginId: string]: string;
}

export default class PluginComment extends Plugin {
	private annotations: PluginAnnotation = {};

	async onload() {
		console.log('Loading Plugin Comment');
		this.annotations = await loadAnnotations(this.app.vault);

		this.app.workspace.onLayoutReady(() => {
			this.patchSettings();
		});
	}

	patchSettings() {
		// Patch openTab to detect when a tab is opened
		this.register(
			around(this.app.setting, {
				openTab: (next: (tab: SettingTab) => void) => {
					return (tab: SettingTab) => {
						const result = next.call(this, tab);
						if (tab && tab.id === 'community-plugins') {
							this.observeTab(tab);
						}
						return result;
					};
				},
			})
		);
	}

	observeTab(tab: SettingTab) {
		const observer = new MutationObserver(() => {
			this.addComments(tab);
		});

		observer.observe(tab.containerEl, { childList: true, subtree: true });

		// Initial call to add comments to already present plugins
		this.addComments(tab);

		// Clean up observer on unload
		this.register(() => observer.disconnect());
	}

	addComments(tab: SettingTab) {
		const pluginsContainer = tab.containerEl.querySelector('.installed-plugins-container');
		if (!pluginsContainer) return;

		const plugins = pluginsContainer.querySelectorAll('.setting-item');
		plugins.forEach(plugin => {
			const settingItemInfo = plugin.querySelector('.setting-item-info');
			if (settingItemInfo) {
				const pluginNameDiv = plugin.querySelector('.setting-item-name');
				const pluginName = pluginNameDiv ? pluginNameDiv.textContent : 'Unknown Plugin';
				const pluginId = pluginName.replace(/\s+/g, '-').toLowerCase();

				const descriptionDiv = settingItemInfo.querySelector('.setting-item-description');
				if (descriptionDiv) {
					const commentDiv = descriptionDiv.querySelector('.plugin-comment');
					if (!commentDiv) {
						const label = document.createElement('div');
						label.innerText = `Personal annotation:`;
						label.className = 'plugin-comment-label';
						descriptionDiv.appendChild(label);

						const comment = document.createElement('div');
						comment.className = 'plugin-comment';
						comment.contentEditable = 'true';
						comment.innerText = this.annotations[pluginId] || `Add your comment about ${pluginName} here...`;

						// Prevent click event propagation to parent
						comment.addEventListener('click', (event) => {
							event.stopPropagation();
						});

						// Save the comment on input change
						comment.addEventListener('input', () => {
							this.annotations[pluginId] = comment.innerText;
							saveAnnotations(this.app.vault, this.annotations);
						});

						descriptionDiv.appendChild(comment);
					}
				}
			}
		});
	}

	onunload() {
		console.log('Unloading Plugin Comment');
	}
}

/*
class CommentSettingTab extends PluginSettingTab {
	constructor(app: App, plugin: Plugin) {
		super(app, plugin);
	}

	display() {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Plugin Comment Settings' });

		// Add any settings here if necessary
	}
}
*/
