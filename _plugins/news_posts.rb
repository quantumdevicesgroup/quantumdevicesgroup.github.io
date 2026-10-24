# Richer news posts from plain Markdown.
#
# Authors only write paragraphs, images (optionally followed by an *italic*
# caption line) and links. At build time this plugin
#   - sets post.summary (first text paragraph, plain), post.photo_count and
#     post.thumb (first photo, skipping PNG graphics) for the news feed;
#   - turns an image paragraph into a <figure> with its caption, and a run of
#     two or more photos into a slider (assets/js/site.js); PNG graphics are
#     shown whole;
#     images open full size on click;
#   - turns a paragraph that is only a YouTube link into an embedded player;
#   - turns a paragraph that is only a bare URL into a link card.

require "cgi"
require "uri"

module NewsPosts
  SUMMARY_WORDS = 45

  def self.summary(markdown)
    markdown.split(/\n\s*\n/).each do |para|
      text = para.strip
      next if text.empty?
      # skip blocks made only of images and their italic caption lines
      next if text.lines.all? { |l| l.strip.empty? || l.strip.start_with?("![") || l.strip =~ /\A\*[^*]+\*\z/ }
      text = text.gsub(/!\[[^\]]*\]\([^)]*\)/, "")              # images
                 .gsub(/\[([^\]]*)\]\([^)]*\)/, '\1')           # [text](url) -> text
                 .gsub(%r{<(https?://[^>]+)>}, "")              # bare autolinks
                 .gsub(/[*_`>#]/, "").gsub(/\s+/, " ").strip
      next if text.empty? || text =~ %r{\Ahttps?://\S+\z}
      words = text.split
      return words.size > SUMMARY_WORDS ? words.first(SUMMARY_WORDS).join(" ") + " …" : text
    end
    nil
  end

  IMG_PARA = %r{\A<p>\s*(<img [^>]+>)\s*(?:<br\s*/?>)?\s*(?:<em>(.*?)</em>)?\s*</p>\z}m
  YT = %r{(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([\w-]{11})}

  def self.figure(img, caption)
    src = img[/src="([^"]+)"/, 1]
    cap = caption.to_s.strip
    img = img.sub("<img ", '<img loading="lazy" ')
    %(<figure class="post-figure"><a href="#{src}" class="lightbox-link">#{img}</a>) +
      (cap.empty? ? "" : "<figcaption>#{cap}</figcaption>") + "</figure>"
  end

  def self.link_card(url)
    u = URI.parse(CGI.unescapeHTML(url)) rescue nil
    host = u&.host.to_s.sub(/\Awww\./, "")
    path = u ? CGI.unescape(u.path.to_s).sub(%r{/\z}, "") : ""
    %(<a class="link-card" href="#{url}" target="_blank" rel="noopener">) +
      %(<span class="link-card-host">#{host}</span>) +
      (path.empty? ? "" : %(<span class="link-card-path">#{CGI.escapeHTML(path)}</span>)) + "</a>"
  end

  def self.enhance(html, title = "")
    blocks = html.split(%r{(?<=</p>)\s*(?=<p>)|(?<=</p>)\n+}).map(&:strip).reject(&:empty?)
    out, run = [], []
    flush = lambda do
      if run.size >= 2
        out << %(<div class="slider" data-slider><div class="slider-track">#{run.join}</div></div>)
      elsif run.size == 1
        out << run.first.sub('class="post-figure"', 'class="post-figure post-figure-single"')
      end
      run.clear
    end
    blocks.each do |b|
      if (m = b.match(IMG_PARA))
        if m[1] =~ /src="[^"]+\.png"/i
          # PNGs are graphics (posters, figures): show whole, never crop in a grid
          flush.call
          out << figure(m[1], m[2]).sub('class="post-figure"', 'class="post-figure post-figure-single post-graphic"')
        else
          run << figure(m[1], m[2])
        end
        next
      end
      flush.call
      link_only = b.match(%r{\A<p>\s*<a href="([^"]+)"[^>]*>(.*?)</a>\s*</p>\z}m)
      if link_only && (yt = link_only[1][YT, 1])
        out << %(<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/#{yt}" ) +
               %(title="Video: #{CGI.escapeHTML(title.to_s)}" loading="lazy" allowfullscreen ) +
               %(allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"></iframe></div>)
      elsif link_only && link_only[2].strip == link_only[1]
        out << link_card(link_only[1])
      else
        out << b
      end
    end
    flush.call
    out.join("\n")
  end
end

# After reading, so every post's Markdown is loaded before any page renders.
Jekyll::Hooks.register :site, :post_read do |site|
  site.posts.docs.each do |post|
    post.data["summary"] ||= NewsPosts.summary(post.content.to_s)
    srcs = post.content.to_s.scan(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/).flatten
    post.data["photo_count"] = srcs.size
    # Feed thumbnail: first photo, falling back to the first image of any kind
    post.data["thumb"] ||= srcs.find { |s| s !~ /\.png\z/i } || post.data["image"]
  end
end

Jekyll::Hooks.register :posts, :post_convert do |post|
  post.content = NewsPosts.enhance(post.content, post.data["title"])
end
