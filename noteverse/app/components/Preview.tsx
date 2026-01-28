'use client';

export default function Preview() {
  return (
    <section id="pricing" className="py-20 px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm uppercase tracking-wide mb-3">PREVIEW</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            See collaboration in action
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Watch how multiple team members edit, comment, and collaborate on the same document seamlessly.
          </p>
        </div>

        {/* Preview Card */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Document Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 text-sm font-medium text-gray-700 dark:text-gray-300">Q3 Marketing Strategy note</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    A
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    S
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    M
                  </div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">3 online</span>
              </div>
            </div>

            {/* Document Content with Comments */}
            <div className="grid lg:grid-cols-3 gap-0">
              {/* Main Content */}
              <div className="lg:col-span-2 p-8 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Q3 Marketing Strategy</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Our focus for Q3 will be on expanding our social media presence and{' '}
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300 px-1 rounded">launching the new content marketing campaign</span>
                    {' '}targeting enterprise customers.
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                    Key objectives include increasing brand awareness by 40% and generating 500 qualified{' '}
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-300 px-1 rounded">leads</span>
                    {' '}through targeted campaigns
                  </p>
                  
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 mt-1">•</span>
                      <span className="text-gray-700 dark:text-gray-300">Launch influencer partnership program</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 mt-1">•</span>
                      <span className="text-gray-700 dark:text-gray-300">Redesign landing pages for better conversion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 mt-1">•</span>
                      <span className="text-gray-700 dark:text-gray-300">Implement email automation sequences</span>
                    </li>
                  </ul>
                </div>

                {/* Live Editing Indicators */}
                <div className="flex items-center gap-4 pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Alex</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Sarah</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span>Mike is typing...</span>
                  </div>
                </div>
              </div>

              {/* Comments Sidebar */}
              <div className="bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comments
                  </h4>
                </div>

                {/* Comment 1 */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      S
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Sarah</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">2m ago</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Should we also include the webinar series in the campaign?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comment 2 */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      A
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Alex</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">1m ago</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Great idea! Let me add that to the list.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Typing Indicator */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      M
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Mike</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">is typing</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
