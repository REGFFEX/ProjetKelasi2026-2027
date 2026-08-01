export default function Error({ statusCode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold">{statusCode ? `Erreur ${statusCode}` : 'Une erreur est survenue'}</h1>
      <p className="mt-2 text-sm text-gray-500">Veuillez réessayer ou retourner à l'accueil.</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
