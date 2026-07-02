import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

function NotFoundPage() {
  useBodyClass('not-found-page');
  useDocumentTitle('EduGuard system — Not Found');

  return (
    <main className="not-found-page__shell">
      <div>
        <h1>404 — Page not found</h1>
        <p>The requested page was not found.</p>
        <Link className="btn btn-primary" to="/">Return home</Link>
      </div>
    </main>
  );
}

NotFoundPage.propTypes = {};

export default NotFoundPage;
