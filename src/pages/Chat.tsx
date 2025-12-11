import { MessageSquare, Send, Sparkles, BookOpen } from 'lucide-react';

export function ChatPage() {
  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white text-gray-900">Chat</h1>
        <p className="dark:text-gray-400 text-gray-600 mt-1">
          Interrogez votre base de connaissances avec l'IA
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 dark:bg-dark-800 bg-white border dark:border-dark-border border-light-border rounded-xl flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gradient-to-br from-lime/20 to-cyan/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-lime" />
            </div>
            <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-2">
              Chat avec votre base de connaissances
            </h3>
            <p className="dark:text-gray-400 text-gray-600 mb-6">
              Posez des questions sur vos contenus et obtenez des réponses contextualisées
              avec citations des sources.
            </p>

            {/* Example Questions */}
            <div className="space-y-2">
              <p className="text-sm dark:text-gray-500 text-gray-400 mb-3">Exemples de questions :</p>
              <button className="w-full text-left px-4 py-3 dark:bg-dark-700 bg-light-200 rounded-lg dark:text-gray-300 text-gray-700 text-sm hover:bg-lime/10 transition-colors">
                <Sparkles size={14} className="inline mr-2 text-lime" />
                Quelles sont les tendances récentes en IA ?
              </button>
              <button className="w-full text-left px-4 py-3 dark:bg-dark-700 bg-light-200 rounded-lg dark:text-gray-300 text-gray-700 text-sm hover:bg-lime/10 transition-colors">
                <BookOpen size={14} className="inline mr-2 text-cyan" />
                Résume les dernières vidéos sur le marketing
              </button>
            </div>

            <div className="mt-6">
              <span className="inline-block px-4 py-2 bg-lime/10 text-lime rounded-full text-sm font-medium">
                RAG Chat - Bientôt disponible
              </span>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t dark:border-dark-border border-light-border">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Posez une question sur vos contenus..."
              disabled
              className="flex-1 px-4 py-3 dark:bg-dark-700 bg-light-200 border dark:border-dark-border border-light-border rounded-xl dark:text-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              disabled
              className="px-6 py-3 bg-lime text-black font-medium rounded-xl hover:bg-lime-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
