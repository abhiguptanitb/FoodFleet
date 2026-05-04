import type { IOrder } from "../types";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import axios from "axios";
import { realtimeService } from "../main";
import { FiMapPin, FiNavigation } from "react-icons/fi";

declare module "leaflet" {
  namespace Routing {
    function control(options: any): any;
    function osrmv1(options?: any): any;
  }
}

const makeDotIcon = (color: string, label: string) =>
  new L.DivIcon({
    html: `<div style="height:34px;width:34px;display:grid;place-items:center;border:2px solid #0a1128;border-radius:14px;background:${color};box-shadow:4px 4px 0 #0a1128;color:#ffffff;font-size:14px;font-weight:900;">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    className: "",
  });

const riderIcon = makeDotIcon("#00a6ff", "R");
const deliveryIcon = makeDotIcon("#ff3d57", "D");

interface Props {
  order: IOrder;
}

const Routing = ({
  from,
  to,
}: {
  from: [number, number];
  to: [number, number];
}) => {
  const map = useMap();

  useEffect(() => {
    const control = L.Routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
      lineOptions: {
        styles: [{ color: "#00a6ff", weight: 6, opacity: 0.9 }],
      },
      addWaypoints: false,
      draggableWaypoints: false,
      show: false,
      createMarker: () => null,
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
    }).addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [from, to, map]);

  return null;
};

const RiderOrderMap = ({ order }: Props) => {
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(
    null
  );

  const hasDeliveryLocation =
    order.deliveryAddress.latitude != null &&
    order.deliveryAddress.longitude != null;
  const deliveryLocation: [number, number] | null = hasDeliveryLocation
    ? [order.deliveryAddress.latitude, order.deliveryAddress.longitude]
    : null;

  useEffect(() => {
    if (!hasDeliveryLocation) return;

    const fetchLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;

          setRiderLocation([latitude, longitude]);

          axios.post(
            `${realtimeService}/api/v1/internal/emit`,
            {
              event: "rider:location",
              room: `user:${order.userId}`,
              payload: { latitude, longitude },
            },
            {
              headers: {
                "x-internal-key": import.meta.env.VITE_INTERNAL_SERVICE_KEY,
              },
            }
          );
        },
        (err) => console.log("Location Error:", err),
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);

    return () => clearInterval(interval);
  }, [hasDeliveryLocation, order.userId]);

  return (
    <div className="overflow-hidden rounded-[26px] border-2 border-[var(--text)] bg-white shadow-[7px_7px_0_var(--accent-2)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--text)] bg-gradient-to-r from-white via-[var(--accent-soft)] to-[#e8fff6] p-4">
        <div>
          <p className="pill-label">Live Route</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text)]">
            Rider Navigation
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">
          <span className="flex items-center gap-1">
            <FiNavigation className="text-[var(--accent)]" />
            Rider
          </span>
          <span className="flex items-center gap-1">
            <FiMapPin className="text-[var(--accent-deep)]" />
            Drop
          </span>
        </div>
      </div>

      <div className="p-3">
        {!deliveryLocation ? (
          <div className="grid h-[420px] place-items-center rounded-2xl border-2 border-dashed border-[color-mix(in_srgb,var(--text)_22%,transparent)] bg-[var(--surface-muted)] px-6 text-center">
            <p className="max-w-sm text-sm font-semibold leading-6 text-[var(--text-soft)]">
              Delivery coordinates are missing for this order.
            </p>
          </div>
        ) : !riderLocation ? (
          <div className="loading-card loading-card-compact h-[420px] justify-center">
            <div className="loading-orbit">
              <span />
              <span />
              <span />
            </div>
            <div>
              <p className="font-black text-[var(--text)]">
                Getting rider location
              </p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                The route will appear once GPS responds.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border-2 border-[var(--text)]">
            <MapContainer
              center={riderLocation}
              zoom={14}
              className="h-[420px] w-full"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={riderLocation} icon={riderIcon}>
                <Popup>You (Rider)</Popup>
              </Marker>
              <Marker position={deliveryLocation} icon={deliveryIcon}>
                <Popup>Delivery Location</Popup>
              </Marker>
              <Routing from={riderLocation} to={deliveryLocation} />
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderOrderMap;
