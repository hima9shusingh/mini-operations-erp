

export const Placeholder = ({ title }: { title: string }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p style={{ marginTop: '1rem', color: '#6B7280' }}>
        This feature has not been implemented yet.
      </p>
    </div>
  );
};
