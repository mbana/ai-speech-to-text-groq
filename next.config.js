/** @type {import('next').NextConfig} */

const nextConfig = {
  // reactStrictMode: false,
  reactStrictMode: true,
	// async rewrites() {
	// 	return [
	// 		{
	// 			source: '/api/deepgram',
	// 			destination: `https://api.deepgram.com`,
	// 		},
	// 	]
	// },
};

module.exports = nextConfig;
