"use client";

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TabNavigation from '../components/TabNavigation';
import OverseasInheritorProcess from '../client/overseas-inheritor/OverseasInheritorProcess';
import BankPanel from '../client/bank/BankPanel';

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="mt-8">
          {activeTab === 0 && (
            <OverseasInheritorProcess
              onDocumentGenerated={(document, hash, encryptedDocument) => {
                console.log('Document generated:', { document, hash, encryptedDocument });
              }}
            />
          )}

          {activeTab === 1 && (
            <BankPanel />
          )}
        </div>
      </main>
    </div>
  );
}