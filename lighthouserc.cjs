module.exports = {
	ci: {
		collect: {
			staticDistDir: 'build',
			url: ['http://localhost/'],
			numberOfRuns: 1
		},
		assert: {
			assertions: {
				'categories:accessibility': ['error', { minScore: 0.9 }],
				'categories:best-practices': ['error', { minScore: 0.9 }],
				'categories:seo': ['error', { minScore: 0.9 }]
			}
		}
	}
};
