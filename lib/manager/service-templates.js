export const DRIVING_SCHOOL_SERVICE_TEMPLATES = [
  {
    id: "de-driving-core",
    name: "Fahrschule Standard",
    description: "Bewaehrte Grundausstattung fuer die meisten Fahrschulen (Praxis, Theorie, Pruefung).",
    categories: [
      {
        name: "PKW / Auto",
        description: "Praxisfahrten und Begleitmodule fuer PKW.",
        services: [
          { name: "PKW Fahrstunde 45 Min", duration: 45, price: 42, description: "Kurze Praxislektion fuer gezielte Themen." },
          { name: "PKW Fahrstunde 90 Min", duration: 90, price: 79, description: "Standard-Praxisfahrt fuer Klasse B." },
          { name: "PKW Fahrstunde 60 Min", duration: 60, price: 55, description: "Kurze Uebungsfahrt oder Auffrischung." },
          { name: "PKW Intensivtraining 120 Min", duration: 120, price: 102, description: "Intensivblock fuer schnelle Lernfortschritte." },
          { name: "PKW Nachtfahrt 90 Min", duration: 90, price: 89, description: "Spezialfahrt bei Dunkelheit." },
          { name: "PKW Autobahnfahrt 90 Min", duration: 90, price: 89, description: "Spezialfahrt Autobahn." },
          { name: "PKW Überlandfahrt 90 Min", duration: 90, price: 89, description: "Spezialfahrt auf Landstrassen." },
          { name: "PKW Parktraining 45 Min", duration: 45, price: 44, description: "Fokus auf Einparken und Rangieren." },
          { name: "PKW Auffrischungsfahrt 60 Min", duration: 60, price: 57, description: "Sicherheitstraining fuer Wiedereinsteiger." },
          { name: "PKW Prüfungsvorbereitung 60 Min", duration: 60, price: 62, description: "Gezielte Vorbereitung auf die praktische Pruefung." },
          { name: "PKW Praktische Prüfung", duration: 60, price: 129, description: "Begleitung und Organisation der praktischen Pruefung." }
        ]
      },
      {
        name: "Theorie",
        description: "Theorieeinheiten und Intensivvorbereitung.",
        services: [
          { name: "Theorieeinheit 90 Min", duration: 90, price: 35, description: "Regulaere Theorieeinheit in Kleingruppe." },
          { name: "Theorie Intensivblock 180 Min", duration: 180, price: 65, description: "Kompakte Themenwiederholung." },
          { name: "Online Theorieeinheit 90 Min", duration: 90, price: 29, description: "Digitale Theorieeinheit per Videokonferenz." },
          { name: "Theorie Einzelcoaching 45 Min", duration: 45, price: 34, description: "Individuelle Betreuung bei Theorieproblemen." },
          { name: "Theorie Prüfungsvorbereitung 60 Min", duration: 60, price: 39, description: "Finale Vorbereitung vor der Theoriepruefung." },
          { name: "Theorieprüfung", duration: 45, price: 59, description: "Organisation und Begleitung der Theoriepruefung." }
        ]
      },
      {
        name: "Pruefungsvorbereitung",
        description: "Gezielte Vorbereitung vor theoretischer oder praktischer Pruefung.",
        services: [
          { name: "Praxis Mock-Prüfung 60 Min", duration: 60, price: 69, description: "Simulation der praktischen Pruefung unter Realbedingungen." },
          { name: "Theorie Mock-Prüfung 45 Min", duration: 45, price: 29, description: "Simulation mit anschliessender Auswertung." },
          { name: "Fehleranalyse 45 Min", duration: 45, price: 35, description: "Gezielte Analyse typischer Fehlerquellen." },
          { name: "Intensiv Prüfungstraining 90 Min", duration: 90, price: 84, description: "Kompaktes Training kurz vor der Pruefung." }
        ]
      }
    ]
  },
  {
    id: "de-license-classes",
    name: "Klassenpaket Erweitert",
    description: "Erweiterte Klassen fuer B197, Motorrad, LKW, Anhaenger und Bus.",
    categories: [
      {
        name: "B197",
        description: "Automatik + Schaltkompetenz fuer Klasse B197.",
        services: [
          { name: "B197 Automatik Fahrstunde 45 Min", duration: 45, price: 44, description: "Praxisstunde mit Fokus auf Automatikfahrzeug." },
          { name: "B197 Schaltkompetenz 45 Min", duration: 45, price: 48, description: "Gezielte Schaltkompetenzuebungen." },
          { name: "B197 Kombi-Fahrstunde 90 Min", duration: 90, price: 85, description: "Praxismix fuer B197-Anforderungen." },
          { name: "B197 Prüfungsvorbereitung 60 Min", duration: 60, price: 64, description: "Pruefungsnahe Vorbereitung fuer B197." }
        ]
      },
      {
        name: "Motorrad",
        description: "A1/A2/A Praxis.",
        services: [
          { name: "Motorrad Fahrstunde 60 Min", duration: 60, price: 64, description: "Regulaere Motorrad-Praxisstunde." },
          { name: "Motorrad Fahrstunde 90 Min", duration: 90, price: 95, description: "Individuelle Praxisfahrt mit Sicherheitsfokus." },
          { name: "Motorrad Grundfahrübungen 60 Min", duration: 60, price: 68, description: "Intensivtraining Grundfahraufgaben." },
          { name: "Motorrad Sonderfahrt 90 Min", duration: 90, price: 99, description: "Sonderfahrt Autobahn/Überland/Nacht." },
          { name: "Motorrad Prüfungsvorbereitung 60 Min", duration: 60, price: 72, description: "Vorbereitung auf praktische Motorradpruefung." },
          { name: "Motorrad Praktische Prüfung", duration: 60, price: 139, description: "Begleitung und Ablaufmanagement der Pruefung." }
        ]
      },
      {
        name: "LKW",
        description: "C/CE Praxismodule.",
        services: [
          { name: "LKW Fahrstunde 60 Min", duration: 60, price: 92, description: "Regulaere LKW-Praxislektion." },
          { name: "LKW Fahrstunde 90 Min", duration: 90, price: 129, description: "LKW-Praxis inkl. Rangieranteilen." },
          { name: "LKW Rangiertraining 60 Min", duration: 60, price: 94, description: "Praxisfokus auf Rueckwaertsfahren und Rangieren." },
          { name: "LKW Sicherheitskontrolle 45 Min", duration: 45, price: 59, description: "Fahrzeugkontrolle und Abfahrtscheck." },
          { name: "LKW Autobahnfahrt 90 Min", duration: 90, price: 134, description: "Autobahntraining fuer LKW." },
          { name: "LKW Prüfungsvorbereitung 60 Min", duration: 60, price: 99, description: "Finale Vorbereitung auf LKW-Pruefung." },
          { name: "LKW Praktische Prüfung", duration: 60, price: 179, description: "Pruefungsbegleitung fuer C/CE." }
        ]
      },
      {
        name: "Anhaenger",
        description: "BE/B96 Praxis.",
        services: [
          { name: "Anhänger Fahrstunde 60 Min", duration: 60, price: 74, description: "Praxisstunde fuer Anhaengerfahrten." },
          { name: "Anhänger Fahrstunde 90 Min", duration: 90, price: 109, description: "Ankuppeln, Rangieren, Fahrpraxis." },
          { name: "Anhänger Rangieren 60 Min", duration: 60, price: 79, description: "Gezieltes Rangiertraining mit Anhaenger." },
          { name: "Anhänger Prüfungsvorbereitung 60 Min", duration: 60, price: 84, description: "Pruefungsfokussiertes BE/B96 Training." },
          { name: "Anhänger Praktische Prüfung", duration: 60, price: 149, description: "Begleitung zur praktischen Anhaengerpruefung." }
        ]
      },
      {
        name: "Bus",
        description: "D/DE Praxismodule.",
        services: [
          { name: "Bus Fahrstunde 60 Min", duration: 60, price: 109, description: "Regulaere Bus-Praxisstunde." },
          { name: "Bus Fahrstunde 90 Min", duration: 90, price: 149, description: "Busfahrpraxis mit Strecken- und Haltestellenszenarien." },
          { name: "Bus Sicherheitstraining 60 Min", duration: 60, price: 118, description: "Gefahrensituationen und Sicherheitsabläufe." },
          { name: "Bus Fahrgasttraining 60 Min", duration: 60, price: 114, description: "Fahrkomfort und Fahrgastorientierung." },
          { name: "Bus Prüfungsvorbereitung 60 Min", duration: 60, price: 124, description: "Vorbereitung auf praktische Buspruefung." },
          { name: "Bus Praktische Prüfung", duration: 60, price: 199, description: "Begleitung und Organisation der Buspruefung." }
        ]
      }
    ]
  }
];

export function listServiceTemplates() {
  return DRIVING_SCHOOL_SERVICE_TEMPLATES.map((tpl) => {
    const serviceCount = tpl.categories.reduce((acc, c) => acc + (c.services?.length || 0), 0);
    return {
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      categoryCount: tpl.categories.length,
      serviceCount,
      categories: tpl.categories.map((c) => c.name)
    };
  });
}

export function getServiceTemplateById(id) {
  return DRIVING_SCHOOL_SERVICE_TEMPLATES.find((t) => t.id === id) || null;
}

export function listServiceSuggestions() {
  const out = [];
  for (const tpl of DRIVING_SCHOOL_SERVICE_TEMPLATES) {
    for (const cat of tpl.categories || []) {
      for (const svc of cat.services || []) {
        const key = `${tpl.id}:${cat.name}:${svc.name}:${svc.duration}`;
        out.push({
          id: key,
          templateId: tpl.id,
          templateName: tpl.name,
          categoryName: cat.name,
          categoryDescription: cat.description || "",
          name: svc.name,
          duration: Number(svc.duration),
          price: svc.price == null ? null : Number(svc.price),
          description: svc.description || ""
        });
      }
    }
  }
  return out;
}

