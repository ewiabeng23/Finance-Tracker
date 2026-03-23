// src/components/TransactionModal.jsx
import React from 'react';
import { Bath, Maximize, MessageCircle, Phone, Share2 } from 'lucide-react';
import PropertyCard from './PropertyCard'; // adjust import path if needed
import styles from './TransactionModal.module.css'; // adjust if using CSS modules

// ... other imports (like t from i18n, etc.)

export default function TransactionModal({ property, similar, lang, t, onClose }) {
  // Generate WhatsApp link
  const waLink = property.agent?.phone
    ? `https://wa.me/${property.agent.phone.replace(/\s/g, '')}?text=${encodeURIComponent(
        `Hi ${property.agent.name}, I'm interested in ${property.title}`
      )}`
    : '#';

  // ... rest of your logic (useEffect, state, etc.) if any

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ... modal header, images, etc. ... */}

        {/* Property details section */}
        <div className={styles.details}>
          {/* stats row */}
          <div className={styles.stats}>
            {property.bedrooms && (
              <div className={styles.statItem}>
                <span>{property.bedrooms}</span> <small>{t.property.beds}</small>
              </div>
            )}
            {property.bathrooms && (
              <div className={styles.statItem}>
                <Bath size={18} /> <span>{property.bathrooms}</span> <small>{t.property.baths}</small>
              </div>
            )}
            {property.area && (
              <div className={styles.statItem}>
                <Maximize size={18} /> <span>{property.area}</span> <small>m²</small>
              </div>
            )}
          </div>

          <div className={styles.meta}>
            <span>{t.property.ref}: IMM-{String(property.id).slice(0, 8)}</span>
            <span>
              {t.property.listed}:{' '}
              {new Date(property.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
            </span>
          </div>
        </div>

        {/* Agent card – fixed nesting */}
        <div className={`${styles.agentCard} glass`}>
          <div className={styles.agentHeader}>
            <div className={styles.agentAvatar}>{property.agent.avatar}</div>
            <div>
              <p className={styles.agentName}>{property.agent.name}</p>
              <p className={styles.agentRole}>
                {lang === 'fr' ? 'Agent immobilier' : 'Real Estate Agent'}
              </p>
            </div>
          </div> {/* ✅ agentHeader closed here */}
          <div className={styles.contactBtns}>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnWhatsapp}
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a
              href={`tel:${(property.agent.phone || '').replace(/\s/g, '')}`}
              className={styles.btnCall}
            >
              <Phone size={16} /> {t.property.call}
            </a>
          </div>
        </div> {/* ✅ agentCard closed here */}

        <button
          className={styles.shareBtn}
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: property.title, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          <Share2 size={15} /> {t.property.share}
        </button>

        {similar.length > 0 && (
          <div className={styles.similar}>
            <h2 className={styles.similarTitle}>{t.property.similar}</h2>
            <div className={styles.similarGrid}>
              {similar.map((p, i) => (
                <PropertyCard key={p.id} property={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
