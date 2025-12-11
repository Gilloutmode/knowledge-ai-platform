import { MessageSquare, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ChatPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 dark:text-gray-400 text-gray-600 hover:text-lime transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-lime/20 to-cyan/20 rounded-xl flex items-center justify-center">
            <MessageSquare size={24} className="text-lime" />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-gray-900">Chat RAG</h1>
            <p className="dark:text-gray-400 text-gray-600">
              Discutez avec votre base de connaissances
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl p-12 text-center">
        <div className="inline-flex p-4 bg-gradient-to-br from-lime/10 to-cyan/10 rounded-2xl mb-4">
          <MessageSquare size={48} className="text-lime" />
        </div>
        <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
          Bientôt disponible
        </h2>
        <p className="dark:text-gray-400 text-gray-500 max-w-md mx-auto">
          L'interface de chat RAG vous permettra de poser des questions sur vos contenus
          et d'obtenir des réponses contextualisées avec citations.
        </p>
      </div>
    </div>
  );
}

export default ChatPage;
