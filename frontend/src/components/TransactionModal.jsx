import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Bed, Bath, Maximize, MapPin, Phone, MessageCircle, Share2, BadgeCheck, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '../hooks/useLang'
import { formatPrice } from '../data/mockData'
import { supabase } from '../lib/supabase'
import { amenityLabels } from '../i18n/translations'
import PropertyCard from '../components/property/PropertyCard'
import styles from './PropertyDetail.module.css'

export default function PropertyDetail() {
  const { id } = useParams()
  const { t, lang } = useLang()
  const [imgIdx, setImgIdx] = useState(0)
  const [property, setProperty] = useState(null)
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('properties').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (!error && data) {
          if (!data.images || !Array.isArray(data.images)) data.images = []
          if (!data.amenities || !Array.isArray(data.amenities)) data.amenities = []
          if (!data.agent) data.agent = {
            name: data.agent_name || '—',
            phone: data.agent_phone || '—',
            avatar: (data.agent_name || 'AG').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
          }
          setProperty(data)
          supabase.from('properties').select('*').eq('verified', true).neq('id', id).eq('city', data.city).limit(3)
            .then(({ data: sim }) => setSimilar(sim || []))
        }
        setLoading(false)
      })
  }, [id])

  if (loading) return (
    <div style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.5)',fontSize:16}}>
      Loading…
    </div>
  )

  if (!property) {
    return (
      <div className={styles.notFound}>
        <h2>{t.general.not_found}</h2>
        <Link to="/listings">{t.general.back_home}</Link>
      </div>
    )
  }

  const typeClass = { rent: 'tag-rent', buy: 'tag-buy', sell: 'tag-sell' }[property.listing_type]
  const typeLabel = { rent: t.types.rent, buy: t.types.buy, sell: t.types.sell }[property.listing_type]
  const aLabels   = amenityLabels[lang] || amenityLabels.fr

  const prevImg = (e) => { e.preventDefault(); setImgIdx(i => (i - 1 + property.images.length) % property.images.length) }
  const nextImg = (e) => { e.preventDefault(); setImgIdx(i => (i + 1) % property.images.length) }

  const waMsg = `${lang==='fr'?'Bonjour, je suis intéressé(e) par ce bien':'Hello, I am interested in this property'}: ${property.title} (${window.location.href})`
  const waLink = `https://wa.me/${(property.agent.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}`

  return (
    <div className={styles.page}>
      <div className="container">
        <Link to="/listings" className={styles.back}>
          <ArrowLeft size={16} /> {lang==='fr' ? 'Retour aux annonces' : 'Back to listings'}
        </Link>

        <div className={styles.layout}>
          <div className={styles.left}>
            <div className={styles.gallery}>
              <img
                src={property.images && property.images.length > 0
                  ? property.images[imgIdx]
                  : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=70'}
                alt={property.title}
                className={styles.mainImg}
                onError={e => { e.target.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=70' }}
              />
              {property.images && property.images.length > 1 && (
                <>
                  <button className={`${styles.navBtn} ${styles.navLeft}`} onClick={prevImg}><ChevronLeft size={20}/></button>
                  <button className={`${styles.navBtn} ${styles.navRight}`} onClick={nextImg}><ChevronRight size={20}/></button>
                  <div className={styles.imgDots}>
                    {property.images.map((_, i) => (
                      <button key={i} className={`${styles.dot} ${i === imgIdx ? styles.dotActive : ''}`} onClick={(e) => { e.preventDefault(); setImgIdx(i) }} />
                    ))}
                  </div>
                </>
              )}
              <div className={styles.galleryOverlay} />
            </div>

            {property.images && property.images.length > 1 && (
              <div className={styles.thumbs}>
                {property.images.map((img, i) => (
                  <button key={i} className={`${styles.thumb} ${i === imgIdx ? styles.thumbActive : ''}`} onClick={() => setImgIdx(i)}>
                    <img src={img} alt="" onError={e => {e.target.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&q=60'}} />
                  </button>
                ))}
              </div>
            )}

            <div className={`${styles.section} glass`}>
              <h2 className={styles.sectionTitle}>{t.property.description}</h2>
              <p className={styles.desc}>{property.description}</p>
            </div>

            <div className={`${styles.section} glass`}>
              <h2 className={styles.sectionTitle}>{t.property.amenities}</h2>
              <div className={styles.amenities}>
                {property.amenities.map(a => (
                  <span key={a} className={styles.amenity}>{aLabels[a] || a}</span>
                ))}
              </div>
            </div>

            <div className={`${styles.section} glass`}>
              <h2 className={styles.sectionTitle}>
                <MapPin size={16} style={{display:'inline',marginRight:6,verticalAlign:'middle'}}/>
                {t.property.location}
              </h2>
              <div className={styles.mapWrap}>
                <iframe
                  title="map"
                  width="100%"
                  height="220"
                  frameBorder="0"
                  style={{ borderRadius: 12, border: 'none', display: 'block' }}
                  src={property.lat && property.lng
                    ? `https://maps.google.com/maps?q=${property.lat},${property.lng}&output=embed&z=15`
                    : `https://maps.google.com/maps?q=${encodeURIComponent((property.neighborhood ? property.neighborhood + ', ' : '') + property.city + ', Cameroon')}&output=embed&z=14`}
                  allowFullScreen
                />
                
                  href={property.lat && property.lng
                    ? `https://www.google.com/maps?q=${property.lat},${property.lng}`
                    : `https://www.google.com/maps/search/${encodeURIComponent((property.neighborhood ? property.neighborhood + ', ' : '') + property.city + ', Cameroon')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mapLink}
                >
                  <MapPin size={13}/> {lang === 'fr' ? 'Ouvrir dans Google Maps' : 'Open in Google Maps'} →
                </a>
              </div>
            </div>
          </div>

          <div className={styles.right}>
            <div className={`${styles.infoCard} glass`}>
              <div className={styles.badges}>
                <span className={`tag ${typeClass}`}>{typeLabel}</span>
                {property.verified && (
                  <span className={styles.verified}><BadgeCheck size={14}/> {t.property.verified}</span>
                )}
              </div>

              <h1 className={styles.propTitle}>{property.title}</h1>

              <div className={styles.locationRow}>
                <MapPin size={15} />
                <span>{property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city}</span>
              </div>

              <p className={styles.price}>{formatPrice(property.price, property.listing_type, lang)}</p>

              <div className={styles.stats}>
                {property.bedrooms != null && property.bedrooms > 0 && (
                  <div className={styles.statItem}><Bed size={18}/> <span>{property.bedrooms}</span> <small>{t.property.beds}</small></div>
                )}
                {property.bedrooms === 0 && (
                  <div className={styles.statItem}><Bed size={18}/> <small>{t.property.studio}</small></div>
                )}
                {property.bathrooms && (
                  <div className={styles.statItem}><Bath size={18}/> <span>{property.bathrooms}</span> <small>{t.property.baths}</small></div>
                )}
                {property.area && (
                  <div className={styles.statItem}><Maximize size={18}/> <span>{property.area}</span> <small>m²</small></div>
                )}
              </div>

              <div className={styles.meta}>
                <span>{t.property.ref}: IMM-{String(property.id).slice(0,8)}</span>
                <span>{t.property.listed}: {new Date(property.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}</span>
              </div>
            </div>

            <div className={`${styles.agentCard} glass`}>
              <div className={styles.agentHeader}>
                <div className={styles.agentAvatar}>{property.agent.avatar}</div>
                <div>
                  <p className={styles.agentName}>{property.agent.name}</p>
                  <p className={styles.agentRole}>{lang==='fr' ? 'Agent immobilier' : 'Real Estate Agent'}</p>
                </div>
              </div>
              <div className={styles.contactBtns}>
                <a href={waLink} target="_blank" rel="noopener noreferrer" className={styles.btnWhatsapp}>
                  <MessageCircle size={16} /> WhatsApp
                </a>
                <a href={`tel:${(property.agent.phone||'').replace(/\s/g,'')}`} className={styles.btnCall}>
                  <Phone size={16} /> {t.property.call}
                </a>
              </div>
            </div>

            <button className={styles.shareBtn} onClick={() => navigator.share?.({ title: property.title, url: window.location.href }) || navigator.clipboard.writeText(window.location.href)}>
              <Share2 size={15} /> {t.property.share}
            </button>
          </div>
        </div>

        {similar.length > 0 && (
          <div className={styles.similar}>
            <h2 className={styles.similarTitle}>{t.property.similar}</h2>
            <div className={styles.similarGrid}>
              {similar.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
