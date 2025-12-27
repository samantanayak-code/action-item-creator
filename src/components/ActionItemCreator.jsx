import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, Square, Download, Upload, Trash2, CheckCircle, AlertCircle, FileText, Globe, Volume2 } from 'lucide-react';

const LANGUAGES = {
  ENGLISH: { code: 'en-US', label: 'English', flag: '🇺🇸' },
  HINDI: { code: 'hi-IN', label: 'हिंदी (Hindi)', flag: '🇮🇳' }
};

const API_CONFIG = {
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 3000,
  TIMEOUT: 30000
};

const VALIDATION_RULES = {
  MAX_TRANSCRIPT_LENGTH: 50000,
  MIN_TRANSCRIPT_LENGTH: 10,
  MAX_ACTION_ITEMS: 100
};

const sanitizeText = (text) => {
  return text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
};

const validateTranscript = (transcript) => {
  const sanitized = sanitizeText(transcript);
  if (sanitized.length < VALIDATION_RULES.MIN_TRANSCRIPT_LENGTH) {
    return { valid: false, error: 'Transcript too short. Please provide more content.' };
  }
  if (sanitized.length > VALIDATION_RULES.MAX_TRANSCRIPT_LENGTH) {
    return { valid: false, error: 'Transcript too long. Please reduce content.' };
  }
  return { valid: true, sanitized };
};

const escapeCSV = (str) => {
  if (str == null) return '';
  const strValue = String(str);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
};

const useSpeechRecognition = (language, onTranscriptUpdate, onError) => {
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = language;

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          if (result.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          onTranscriptUpdate(finalTranscriptRef.current + interimTranscript);
        } else {
          onTranscriptUpdate(finalTranscriptRef.current + interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        switch (event.error) {
          case 'no-speech': break;
          case 'audio-capture': onError('Microphone not accessible. Please check permissions.'); break;
          case 'not-allowed': onError('Microphone permission denied. Please allow access.'); break;
          case 'network': onError('Network error. Please check your connection.'); break;
          default: onError(`Recognition error: ${event.error}`);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (err) { console.log('Recognition cleanup:', err); }
      }
    };
  }, [language, onTranscriptUpdate, onError]);

  const start = useCallback(() => {
    if (recognitionRef.current) {
      try {
        finalTranscriptRef.current = '';
        recognitionRef.current.start();
      } catch (err) {
        console.error('Start error:', err);
        throw new Error('Failed to start speech recognition');
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (err) { console.log('Stop error:', err); }
    }
  }, []);

  const restart = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (err) {}
    }
  }, []);

  return { start, stop, restart, isSupported, finalTranscriptRef };
};

export default function ActionItemCreator() {
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES.HINDI.code);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [actionItems, setActionItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isFrozen, setIsFrozen] = useState(false);
  
  const timerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleTranscriptUpdate = useCallback((newTranscript) => {
    setTranscript(newTranscript);
  }, []);

  const handleRecognitionError = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const { start, stop, restart, isSupported, finalTranscriptRef } = useSpeechRecognition(
    selectedLanguage, handleTranscriptUpdate, handleRecognitionError
  );

  useEffect(() => {
    if (isRecording) {
      const restartInterval = setInterval(() => { restart(); }, 55000);
      return () => clearInterval(restartInterval);
    }
  }, [isRecording, restart]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(null); setSuccess(null); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }
    try {
      setError(null);
      finalTranscriptRef.current = '';
      setTranscript('');
      setRecordingTime(0);
      await start();
      setIsRecording(true);
      timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
      console.error('Recording start error:', err);
    }
  }, [isSupported, start, finalTranscriptRef]);

  const stopRecording = useCallback(() => {
    stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
    setTranscript(finalTranscriptRef.current);
  }, [stop, finalTranscriptRef]);

  const formatTime = useMemo(() => {
    return (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
  }, []);

  const generateActionItems = useCallback(async () => {
    const validation = validateTranscript(transcript);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => { abortControllerRef.current.abort(); }, API_CONFIG.TIMEOUT);

    const extractionPrompt = `You are an expert AI system for extracting action items from meeting transcripts. The transcript may be in Hindi or English, but you must ALWAYS respond in English.

CRITICAL INSTRUCTIONS:
1. Extract ALL action items, tasks, assignments, and commitments
2. If input is in Hindi/Hinglish, translate and extract in English
3. For each action item, identify:
   - Action Name (What): Clear, specific task description in English
   - Action By (Whom): Person/team responsible (translate names phonetically if needed)
   - Due Date (When): Deadline or timeframe (if not mentioned: "TBD")
   - Process (How): Step-by-step breakdown as bullet points in English
   - Remarks: Additional context, dependencies, priority in English

4. Handle missing information:
   - No deadline mentioned → "TBD"
   - No person assigned → "Not Assigned"
   - No specific process → ["Review requirements", "Execute task", "Confirm completion"]

5. Quality Standards:
   - Be thorough - don't miss any action item
   - Use clear, professional English
   - Break complex tasks into clear steps
   - Preserve important context in remarks

TRANSCRIPT:
${validation.sanitized}

Respond with ONLY a valid JSON array. No explanations, no markdown, no backticks. Format:
[
  {
    "actionName": "Complete project proposal document",
    "actionBy": "Rajesh Kumar",
    "dueDate": "December 15, 2024",
    "process": ["Review previous proposals", "Draft initial outline", "Get stakeholder input", "Finalize document"],
    "remarks": "High priority - client presentation scheduled"
  }
]`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: API_CONFIG.MODEL,
          max_tokens: API_CONFIG.MAX_TOKENS,
          temperature: 0.3,
          messages: [{ role: 'user', content: extractionPrompt }]
        }),
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);

      const data = await response.json();
      const responseText = data.content?.find(item => item.type === 'text')?.text || '';
      if (!responseText) throw new Error('Empty response from API');

      let cleanedText = responseText.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonStart = cleanedText.indexOf('[');
      const jsonEnd = cleanedText.lastIndexOf(']') + 1;
      if (jsonStart === -1 || jsonEnd === 0) throw new Error('No valid JSON array found in response');
      
      cleanedText = cleanedText.substring(jsonStart, jsonEnd);
      const parsedItems = JSON.parse(cleanedText);
      
      if (!Array.isArray(parsedItems)) throw new Error('Response is not an array');
      if (parsedItems.length === 0) {
        setError('No action items found in the transcript. Please ensure the content contains tasks or assignments.');
        return;
      }
      if (parsedItems.length > VALIDATION_RULES.MAX_ACTION_ITEMS) {
        setError(`Too many action items (${parsedItems.length}). Please process in smaller batches.`);
        return;
      }

      const validatedItems = parsedItems.map((item) => ({
        actionName: sanitizeText(item.actionName || 'Unnamed Action'),
        actionBy: sanitizeText(item.actionBy || 'Not Assigned'),
        dueDate: sanitizeText(item.dueDate || 'TBD'),
        process: Array.isArray(item.process) ? item.process.map(step => sanitizeText(step)) : ['Complete task'],
        remarks: sanitizeText(item.remarks || '')
      }));

      setActionItems(validatedItems);
      setSuccess(`Successfully extracted ${validatedItems.length} action item${validatedItems.length !== 1 ? 's' : ''}`);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timeout. Please try again with a shorter transcript.');
      } else if (err instanceof SyntaxError) {
        setError('Failed to parse AI response. Please try again.');
        console.error('JSON Parse Error:', err);
      } else {
        setError(err.message || 'Failed to generate action items. Please try again.');
        console.error('Generation Error:', err);
      }
    } finally {
      setIsProcessing(false);
      clearTimeout(timeoutId);
    }
  }, [transcript]);

  const exportToCSV = useCallback(() => {
    if (actionItems.length === 0) {
      setError('No action items to export.');
      return;
    }
    try {
      const headers = ['Sl. No.', 'Action Name (What)', 'Action By (Whom)', 'Due Date (When)', 'Process (How)', 'Remarks'];
      const csvRows = [headers.join(',')];
      actionItems.forEach((item, index) => {
        const row = [
          index + 1,
          escapeCSV(item.actionName),
          escapeCSV(item.actionBy),
          escapeCSV(item.dueDate),
          escapeCSV(item.process.join('; ')),
          escapeCSV(item.remarks)
        ];
        csvRows.push(row.join(','));
      });
      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `action-items-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess('CSV exported successfully');
    } catch (err) {
      setError('Failed to export CSV');
      console.error('CSV Export Error:', err);
    }
  }, [actionItems]);

  const exportToJSON = useCallback(() => {
    if (actionItems.length === 0) {
      setError('No action items to export.');
      return;
    }
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        language: selectedLanguage,
        transcript: transcript,
        actionItems: actionItems,
        metadata: { totalItems: actionItems.length, frozen: isFrozen }
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `action-items-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess('JSON exported successfully');
    } catch (err) {
      setError('Failed to export JSON');
      console.error('JSON Export Error:', err);
    }
  }, [actionItems, transcript, selectedLanguage, isFrozen]);

  const importFromJSON = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.actionItems || !Array.isArray(data.actionItems)) {
          throw new Error('Invalid file format: missing action items array');
        }
        if (data.actionItems.length > VALIDATION_RULES.MAX_ACTION_ITEMS) {
          throw new Error(`Too many action items. Maximum is ${VALIDATION_RULES.MAX_ACTION_ITEMS}`);
        }
        const validatedItems = data.actionItems.map(item => ({
          actionName: sanitizeText(item.actionName || 'Unnamed Action'),
          actionBy: sanitizeText(item.actionBy || 'Not Assigned'),
          dueDate: sanitizeText(item.dueDate || 'TBD'),
          process: Array.isArray(item.process) ? item.process.map(step => sanitizeText(step)) : ['Complete task'],
          remarks: sanitizeText(item.remarks || '')
        }));
        setActionItems(validatedItems);
        if (data.transcript) setTranscript(sanitizeText(data.transcript));
        if (data.language && Object.values(LANGUAGES).some(l => l.code === data.language)) {
          setSelectedLanguage(data.language);
        }
        setSuccess(`Successfully imported ${validatedItems.length} action item${validatedItems.length !== 1 ? 's' : ''}`);
        setIsFrozen(false);
      } catch (err) {
        setError(err.message || 'Failed to import file. Please ensure it is a valid JSON file.');
        console.error('Import Error:', err);
      }
    };
    reader.onerror = () => { setError('Failed to read file'); };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const updateActionItem = useCallback((index, field, value) => {
    if (isFrozen) return;
    setActionItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: sanitizeText(value) };
      return updated;
    });
  }, [isFrozen]);

  const deleteActionItem = useCallback((index) => {
    if (isFrozen) return;
    if (window.confirm('Are you sure you want to delete this action item?')) {
      setActionItems(prev => prev.filter((_, i) => i !== index));
      setSuccess('Action item deleted');
    }
  }, [isFrozen]);

  const freezeActionItems = useCallback(() => {
    if (actionItems.length === 0) {
      setError('No action items to freeze.');
      return;
    }
    setIsFrozen(true);
    setSuccess(`Successfully frozen ${actionItems.length} action item${actionItems.length !== 1 ? 's' : ''}. They are now read-only.`);
  }, [actionItems.length]);

  const resetAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear everything? This action cannot be undone.')) {
      if (isRecording) stopRecording();
      setTranscript('');
      setActionItems([]);
      setIsFrozen(false);
      setError(null);
      setSuccess(null);
      setRecordingTime(0);
      finalTranscriptRef.current = '';
    }
  }, [isRecording, stopRecording, finalTranscriptRef]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Enterprise Action Item Creator</h1>
                <p className="text-blue-100">Bilingual Support • High-Accuracy STT • Secure Export/Import</p>
              </div>
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <Globe size={20} />
                <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={isRecording || isFrozen}
                  className="bg-transparent text-white font-semibold border-none outline-none cursor-pointer">
                  {Object.values(LANGUAGES).map(lang => (
                    <option key={lang.code} value={lang.code} className="text-gray-800">
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 rounded-r-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 m-6 rounded-r-lg flex items-start gap-3">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-green-800">Success</h3>
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Volume2 size={24} className="text-blue-600" />
                    Step 1: Record or Enter Transcript
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedLanguage === LANGUAGES.HINDI.code 
                      ? 'Speak in Hindi - Action items will be generated in English' 
                      : 'Speak in English - Action items will be generated in English'}
                  </p>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-lg border-2 border-red-300 animate-pulse">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-mono font-bold text-red-700">{formatTime(recordingTime)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mb-4 flex-wrap">
                <button onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
                    isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={isFrozen || isProcessing}>
                  {isRecording ? (<><Square size={20} fill="white" />Stop Recording</>) : (<><Mic size={20} />Start Recording</>)}
                </button>
                <button onClick={resetAll}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all shadow-md"
                  disabled={isRecording || isProcessing}>
                  <Trash2 size={20} />Reset All
                </button>
              </div>

              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
                placeholder={`Your ${selectedLanguage === LANGUAGES.HINDI.code ? 'Hindi' : 'English'} transcript will appear here...\n\nOr type/paste text directly.`}
                className="w-full h-64 p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm bg-white shadow-inner"
                disabled={isRecording || isFrozen || isProcessing} />

              <div className="mt-4 flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-800">Pro Tips:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>Speak clearly about tasks, assignments, and deadlines</li>
                    <li>Hindi audio will be automatically translated to English action items</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button onClick={generateActionItems}
                disabled={isProcessing || !transcript.trim() || isFrozen || isRecording}
                className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 shadow-lg">
                {isProcessing ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing Transcript...
                  </span>
                ) : `Generate Action Items ${selectedLanguage === LANGUAGES.HINDI.code ? '(Hindi → English)' : ''}`}
              </button>
            </div>

            {actionItems.length > 0 && (
              <div className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl p-6 border-2 border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <CheckCircle size={24} className="text-green-600" />
                      Step 2: Review & Export Action Items
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {actionItems.length} action item{actionItems.length !== 1 ? 's' : ''} extracted
                      {isFrozen && <span className="ml-2 text-green-600 font-semibold">✓ Frozen</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={exportToCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md">
                      <Download size={18} />Export CSV
                    </button>
                    <button onClick={exportToJSON}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md">
                      <FileText size={18} />Export JSON
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all cursor-pointer shadow-md">
                      <Upload size={18} />Import JSON
                      <input type="file" accept=".json" onChange={importFromJSON} className="hidden" />
                    </label>
                    {!isFrozen && (
                      <button onClick={freezeActionItems}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md">
                        <CheckCircle size={18} />Freeze
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg shadow-lg">
                  <table className="w-full border-collapse bg-white">
                    <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                      <tr>
                        <th className="p-4 text-left font-bold w-20">Sl. No.</th>
                        <th className="p-4 text-left font-bold min-w-[200px]">Action Name (What)</th>
                        <th className="p-4 text-left font-bold min-w-[150px]">Remarks</th>
                        {!isFrozen && <th className="p-4 text-center font-bold w-24">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {actionItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                          <td className="p-4 font-bold text-gray-700 text-center">{idx + 1}</td>
                          <td className="p-4">
                            {isFrozen ? (
                              <span className="font-semibold text-gray-800">{item.actionName}</span>
                            ) : (
                              <input type="text" value={item.actionName}
                                onChange={(e) => updateActionItem(idx, 'actionName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Action name..." />
                            )}
                          </td>
                          <td className="p-4">
                            {isFrozen ? (
                              <span className="text-gray-800">{item.actionBy}</span>
                            ) : (
                              <input type="text" value={item.actionBy}
                                onChange={(e) => updateActionItem(idx, 'actionBy', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Person/Team..." />
                            )}
                          </td>
                          <td className="p-4">
                            {isFrozen ? (
                              <span className="text-gray-800">{item.dueDate}</span>
                            ) : (
                              <input type="text" value={item.dueDate}
                                onChange={(e) => updateActionItem(idx, 'dueDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Due date..." />
                            )}
                          </td>
                          <td className="p-4">
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {item.process.map((step, stepIdx) => (
                                <li key={stepIdx} className="text-gray-700">{step}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-4">
                            {isFrozen ? (
                              <span className="text-sm text-gray-600">{item.remarks}</span>
                            ) : (
                              <textarea value={item.remarks}
                                onChange={(e) => updateActionItem(idx, 'remarks', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                                rows="2" placeholder="Additional notes..." />
                            )}
                          </td>
                          {!isFrozen && (
                            <td className="p-4 text-center">
                              <button onClick={() => deleteActionItem(idx)}
                                className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                title="Delete action item">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isFrozen && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Note:</strong> You can edit any field before freezing. Once frozen, action items become read-only.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 border-t border-gray-200 p-4 text-center text-sm text-gray-600">
            <p>🔒 Enterprise-grade security • 🌐 Bilingual support (Hindi/English) • 📊 Export to CSV/JSON • ⚡ High-accuracy STT</p>
          </div>
        </div>
      </div>
    </div>
  );
}">Action By (Whom)</th>
                        <th className="p-4 text-left font-bold min-w-[120px]">Due Date (When)</th>
                        <th className="p-4 text-left font-bold min-w-[200px]">Process (How)</th>
                        <th className="p-4 text-left font-bold min-w-[150px]
