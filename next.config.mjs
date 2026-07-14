/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // El sistema no se embebe en iframes de terceros — bloquea clickjacking.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Evita que el navegador "adivine" un tipo de contenido distinto al declarado.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // No manda la URL completa como referrer a sitios externos.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Sin necesidad de geolocalización/cámara/micrófono en este sistema.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
