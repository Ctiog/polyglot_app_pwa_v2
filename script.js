// Logique de l'application PolyGlot (Version mise à jour avec Nettoyage Vocal Intelligent)

// Base de données de vocabulaire hors-ligne (Flashcards)
const vocabularyData = {
  es: [
    { original: "Bonjour / Salut", translated: "¡Hola!", category: "Salutations" },
    { original: "Comment vas-tu ?", translated: "¿Cómo estás?", category: "Conversations" },
    { original: "Merci beaucoup", translated: "Muchas gracias", category: "Politesse" },
    { original: "Où sont les toilettes ?", translated: "¿Dónde está el baño?", category: "Voyage" },
    { original: "L'addition, s'il vous plaît", translated: "La cuenta, por favor", category: "Restaurant" }
  ],
  zh: [
    { original: "Bonjour", translated: "你好", pinyin: "Nǐ hǎo", category: "Salutations" },
    { original: "Merci", translated: "谢谢", pinyin: "Xièxiè", category: "Politesse" },
    { original: "Au revoir", translated: "再见", pinyin: "Zàijiàn", category: "Salutations" },
    { original: "Combien ça coûte ?", translated: "多少钱？", pinyin: "Duōshǎo qián?", category: "Achats" },
    { original: "C'est très délicieux", translated: "很好吃", pinyin: "Hěn hǎo chī", category: "Nourriture" }
  ]
};

// Dictionnaire de secours
const offlineDictionary = {
  "bonjour": { "es-ES": "¡Hola!", "zh-CN": "你好 (Nǐ hǎo)", "en-US": "Hello", "de-DE": "Hallo" },
  "merci": { "es-ES": "Gracias", "zh-CN": "谢谢 (Xièxiè)", "en-US": "Thank you", "de-DE": "Danke" },
  "au revoir": { "es-ES": "Adiós", "zh-CN": "再见 (Zàijiàn)", "en-US": "Goodbye", "de-DE": "Auf Wiedersehen" },
  "oui": { "es-ES": "Sí", "zh-CN": "是 (Shì)", "en-US": "Yes", "de-DE": "Ja" },
  "non": { "es-ES": "No", "zh-CN": "不 (Bù)", "en-US": "No", "de-DE": "Nein" }
};

let currentTargetLang = "es";
let currentCardIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTranslator();
  initFlashcards();
  checkOnlineStatus();
});

// Fonction de nettoyage intelligent de la voix (Supprime hésitations, "euh", "hum" et répétitions)
function cleanSpokenText(rawText) {
  if (!rawText) return "";

  let cleaned = rawText.trim();

  // 1. Liste des mots parasites et hésitations selon les langues
  const fillerPatterns = [
    /\b(euh|hum|euhm|hmm|uh|um|er|ah|eh|bah|ben|du coup|alors|genre)\b/gi,
    /\b(bueno|este|pues|o sea|eh|em)\b/gi,
    /\b(ähm|ahm|halt|sozusagen)\b/gi,
    /\b(那个|思考|呃|啊|嗯)\b/g
  ];

  // Appliquer le nettoyage des parasites
  fillerPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, ' ');
  });

  // 2. Supprimer les répétitions consécutives de mots (ex: "je je veux" -> "je veux", "est est" -> "est")
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // 3. Normaliser les espaces et ponctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 4. Majuscule sur la première lettre
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

// 1. Navigation Onglets
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

// 2. Gestion de la Traduction & Reconnaissance Vocale Filtrée
function initTranslator() {
  const translateBtn = document.getElementById('translate-btn');
  const sourceText = document.getElementById('source-text');
  const targetText = document.getElementById('target-text');
  const outputBox = document.getElementById('output-box');
  const micBtn = document.getElementById('mic-btn');
  const speakTargetBtn = document.getElementById('speak-target-btn');
  const swapBtn = document.getElementById('swap-langs');
  const pinyinBox = document.getElementById('pinyin-box');
  const pinyinText = document.getElementById('pinyin-text');
  const filterTag = document.getElementById('filter-tag');

  // Traduire
  translateBtn.addEventListener('click', async () => {
    const text = sourceText.value.trim();
    if (!text) return;

    const sourceLang = document.getElementById('source-lang').value.split('-')[0];
    const targetLang = document.getElementById('target-lang').value.split('-')[0];
    const targetLangFull = document.getElementById('target-lang').value;

    outputBox.classList.remove('hidden');
    targetText.innerText = "Traduction en cours...";

    try {
      if (navigator.onLine) {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`);
        const data = await response.json();
        
        if (data && data.responseData) {
          targetText.innerText = data.responseData.translatedText;
        } else {
          fallbackTranslation(text, targetLangFull);
        }
      } else {
        fallbackTranslation(text, targetLangFull);
      }
    } catch (err) {
      fallbackTranslation(text, targetLangFull);
    }

    if (targetLangFull === 'zh-CN') {
      pinyinBox.classList.remove('hidden');
      pinyinText.innerText = "Prononciation Pinyin disponible via le bouton audio.";
    } else {
      pinyinBox.classList.add('hidden');
    }
  });

  function fallbackTranslation(text, targetLangCode) {
    const cleanKey = text.toLowerCase().trim();
    if (offlineDictionary[cleanKey] && offlineDictionary[cleanKey][targetLangCode]) {
      targetText.innerText = offlineDictionary[cleanKey][targetLangCode] + " (Mode Hors-Ligne)";
    } else {
      targetText.innerText = text + " (Traduite en mode hors-ligne)";
    }
  }

  swapBtn.addEventListener('click', () => {
    const srcSelect = document.getElementById('source-lang');
    const tgtSelect = document.getElementById('target-lang');
    const temp = srcSelect.value;
    srcSelect.value = tgtSelect.value;
    tgtSelect.value = temp;
  });

  // Reconnaissance Vocale Intelligente
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener('click', () => {
      recognition.lang = document.getElementById('source-lang').value;
      recognition.start();
      micBtn.style.background = '#ef4444';
      micBtn.style.color = '#fff';
      micBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Écoute en cours...';
      filterTag.classList.add('hidden');
    });

    recognition.onresult = (event) => {
      const rawTranscript = event.results[0][0].transcript;
      
      // Filtrage du texte parlé pour enlever "euh", "hum", répétitions, etc.
      const cleanedTranscript = cleanSpokenText(rawTranscript);
      
      sourceText.value = cleanedTranscript;
      filterTag.classList.remove('hidden');
      resetMicBtn();
    };

    recognition.onerror = recognition.onend = () => { resetMicBtn(); };

    function resetMicBtn() {
      micBtn.style.background = 'rgba(239, 68, 68, 0.2)';
      micBtn.style.color = '#f87171';
      micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Parler';
    }
  }

  // Synthèse Vocale
  speakTargetBtn.addEventListener('click', () => {
    const textToSpeak = targetText.innerText;
    const lang = document.getElementById('target-lang').value;
    
    if ('speechSynthesis' in window && textToSpeak) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    sourceText.value = '';
    outputBox.classList.add('hidden');
    filterTag.classList.add('hidden');
  });
}

// 3. Flashcards
function initFlashcards() {
  const flashcard = document.getElementById('flashcard');
  const prevBtn = document.getElementById('prev-card');
  const nextBtn = document.getElementById('next-card');
  const langToggleBtns = document.querySelectorAll('.lang-toggle-btn');

  langToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      langToggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTargetLang = btn.dataset.target;
      currentCardIndex = 0;
      updateCard();
    });
  });

  flashcard.addEventListener('click', () => {
    flashcard.classList.toggle('flipped');
  });

  prevBtn.addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      updateCard();
    }
  });

  nextBtn.addEventListener('click', () => {
    const list = vocabularyData[currentTargetLang];
    if (currentCardIndex < list.length - 1) {
      currentCardIndex++;
      updateCard();
    }
  });

  updateCard();
}

function updateCard() {
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.remove('flipped');

  const list = vocabularyData[currentTargetLang];
  const item = list[currentCardIndex];

  document.getElementById('card-category').innerText = item.category;
  document.getElementById('card-original').innerText = item.original;
  document.getElementById('card-translated').innerText = item.translated;

  const pinyinBack = document.getElementById('card-pinyin-back');
  if (item.pinyin) {
    pinyinBack.innerText = "Pinyin: " + item.pinyin;
    pinyinBack.classList.remove('hidden');
  } else {
    pinyinBack.classList.add('hidden');
  }

  document.getElementById('card-counter').innerText = `${currentCardIndex + 1} / ${list.length}`;
}

// 4. Statut Réseau
function checkOnlineStatus() {
  const netStatus = document.getElementById('net-status');
  function updateStatus() {
    if (navigator.onLine) {
      netStatus.innerText = "En ligne";
      netStatus.style.color = "#34d399";
    } else {
      netStatus.innerText = "Hors-Ligne";
      netStatus.style.color = "#f87171";
    }
  }
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}
