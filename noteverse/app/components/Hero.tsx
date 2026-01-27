'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              Real-time collaboration
            </div>

            {/* Heading */}
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              NoteVerse
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-600 leading-relaxed">
              Write, collaborate, and sync in real time.
            </p>

            {/* Description */}
            <p className="text-lg text-gray-500">
              The modern note-taking platform where teams, students, and professionals come together to create and collaborate seamlessly.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Link href="/signup" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold">
                Get Started
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
                  A
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
                  B
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
                  C
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
                  D
                </div>
              </div>
              <p className="text-gray-600 font-medium">
                <span className="text-gray-900 font-bold">2,000+</span> teams collaborating
              </p>
            </div>
          </div>

          {/* Right Content - Document Preview */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Document Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Project Notes</h3>
                      <p className="text-xs text-gray-500">Last edited 2 min ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-white"></div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-white"></div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 border-white"></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">3 online</span>
                  </div>
                </div>
              </div>

              {/* Document Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded w-full"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-yellow-200 rounded w-full"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-red-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                  <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>

              {/* Collaboration Badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  Sarah
                </div>
              </div>

              {/* Collaborating Badge */}
              <div className="absolute bottom-6 right-6 bg-white rounded-lg shadow-lg px-4 py-2 border border-gray-200">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">3 collaborating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
