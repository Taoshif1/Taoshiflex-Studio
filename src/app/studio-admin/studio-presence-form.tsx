"use client";

import { FormEvent, useState } from "react";

import {
  normalizeStudioPresence,
  studioPresencePlatformLabels,
  studioPresencePlatforms,
  type StudioPresence,
  type StudioSocialLink,
} from "@/lib/studio-presence";

type StudioPresenceFormProps = {
  value: unknown;
  pending: boolean;
  submit: (value: StudioPresence) => void;
};

export function StudioPresenceForm({
  value,
  pending,
  submit,
}: StudioPresenceFormProps) {
  const initial = normalizeStudioPresence(value);
  const [bookingEnabled, setBookingEnabled] = useState(
    initial.bookingEnabled,
  );
  const [links, setLinks] = useState<StudioSocialLink[]>(
    initial.socialLinks,
  );

  function updateLink(id: string, update: Partial<StudioSocialLink>) {
    setLinks((current) =>
      current.map((link) => (link.id === id ? { ...link, ...update } : link)),
    );
  }

  function addLink() {
    if (links.length >= 12) return;
    setLinks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        platform: "facebook",
        label: "",
        url: "",
        enabled: true,
        sortOrder: (current.length + 1) * 10,
      },
    ]);
  }

  function moveLink(index: number, direction: -1 | 1) {
    setLinks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit({
      email: String(form.get("email") ?? "").trim(),
      location: String(form.get("location") ?? "").trim(),
      availability: String(form.get("availability") ?? "").trim(),
      bookingUrl: String(form.get("bookingUrl") ?? "").trim(),
      bookingEnabled,
      socialLinks: links.map((link, index) => ({
        ...link,
        label: link.label.trim(),
        url: link.url.trim(),
        sortOrder: (index + 1) * 10,
      })),
    });
  }

  return (
    <form className="editor-form presence-form" onSubmit={onSubmit}>
      <div className="form-group">
        <header>
          <div>
            <h3>Contact</h3>
            <p>Public contact details shown in the site footer.</p>
          </div>
        </header>
        <div className="field-grid">
          <label>
            Email
            <input
              name="email"
              type="email"
              maxLength={254}
              defaultValue={initial.email}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Location
            <input
              name="location"
              maxLength={120}
              defaultValue={initial.location}
              required
            />
          </label>
          <label>
            Availability
            <input
              name="availability"
              maxLength={160}
              defaultValue={initial.availability}
              required
            />
          </label>
        </div>
      </div>

      <div className="form-group">
        <header>
          <div>
            <h3>Booking</h3>
            <p>Optionally link to an external HTTPS booking page.</p>
          </div>
        </header>
        <label>
          Book a Call URL
          <input
            name="bookingUrl"
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://..."
            defaultValue={initial.bookingUrl}
            required={bookingEnabled}
          />
        </label>
        <label className="presence-enabled">
          <input
            type="checkbox"
            checked={bookingEnabled}
            onChange={(event) => setBookingEnabled(event.target.checked)}
          />
          Show Book a Call in the public footer
        </label>
      </div>

      <div className="form-group">
        <header>
          <div>
            <h3>Social links</h3>
            <p>
              Add up to 12 restrained text links. The same platform may appear
              more than once when labels identify each account.
            </p>
          </div>
          <button
            type="button"
            onClick={addLink}
            disabled={links.length >= 12 || pending}
          >
            Add social link
          </button>
        </header>

        {links.length ? (
          <div className="presence-links">
            {links.map((link, index) => (
              <article className="presence-link" key={link.id}>
                <div className="presence-link-fields">
                  <label>
                    Platform
                    <select
                      value={link.platform}
                      onChange={(event) =>
                        updateLink(link.id, {
                          platform: event.target
                            .value as StudioSocialLink["platform"],
                        })
                      }
                    >
                      {studioPresencePlatforms.map((platform) => (
                        <option value={platform} key={platform}>
                          {studioPresencePlatformLabels[platform]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Label
                    <input
                      maxLength={80}
                      value={link.label}
                      onChange={(event) =>
                        updateLink(link.id, { label: event.target.value })
                      }
                      placeholder="Taoshiflex Studio"
                      required
                    />
                  </label>
                  <label>
                    HTTPS URL
                    <input
                      type="url"
                      inputMode="url"
                      maxLength={500}
                      value={link.url}
                      onChange={(event) =>
                        updateLink(link.id, { url: event.target.value })
                      }
                      placeholder={
                        link.platform === "whatsapp"
                          ? "https://wa.me/..."
                          : "https://..."
                      }
                      required
                    />
                  </label>
                </div>
                <div className="presence-link-actions">
                  <label className="presence-enabled">
                    <input
                      type="checkbox"
                      checked={link.enabled}
                      onChange={(event) =>
                        updateLink(link.id, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() => moveLink(index, -1)}
                    disabled={index === 0 || pending}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLink(index, 1)}
                    disabled={index === links.length - 1 || pending}
                  >
                    Move down
                  </button>
                  <button
                    className="danger"
                    type="button"
                    onClick={() =>
                      setLinks((current) =>
                        current.filter((item) => item.id !== link.id),
                      )
                    }
                    disabled={pending}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="presence-empty">
            No social links. The footer will remain contact-focused.
          </p>
        )}
      </div>

      <button disabled={pending}>
        {pending ? "Saving..." : "Save Studio Presence"}
      </button>
    </form>
  );
}
