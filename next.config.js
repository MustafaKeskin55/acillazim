/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  optimizeFonts: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'react-icons',
      'recharts',
      'date-fns',
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/free-regular-svg-icons',
      '@fortawesome/react-fontawesome'
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'acillazim.net',
      'admin.acillazim.net',
      'api.acillazim.net',
      '213.142.159.11',
      'api.acillazim.com',
      'dev-api.acillazim.com',
      'staging-api.acillazim.com',
      'images.unsplash.com',
      'marketplace.canva.com',
      'cdk-hnb659fds-assets-140873265113-us-east-1.s3.us-east-1.amazonaws.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com'
    ],
    unoptimized: true
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: false,
      crypto: false,
      buffer: false,
      assert: false
    };
    return config;
  },
  async rewrites() {
    const backend = (
      process.env.BACKEND_INTERNAL_URL ||
      'http://acillazim-backend:8080'
    ).replace(/\/$/, '');
    return [
      {
        source: '/media/vitrin/:path*',
        destination: `${backend}/uploads/advertisements/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
