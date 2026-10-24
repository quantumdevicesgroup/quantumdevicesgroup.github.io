# Links the publication list to the people in _people/.
#
# A person matches a BibTeX author when the surname is equal and the given
# name starts with the same initial, counting only papers from the person's
# `since` year on (so a namesake's older papers are not attributed to them).
# The surname and initial come from `name`; set `bib_last` / `bib_initial` in
# the person's front matter when the name is written differently in papers.
#
# Provides
#   page.pub_query  regex used by the person page's {% bibliography %} query
#   page.pub_count  number of matching papers (0 hides the publications link)
#   page.pub_rank   sort key: most papers first, then team order
#   /publications.bib and /team/<slug>/publications.bib  downloadable BibTeX
#   {{ entry | pub_authors }}  author list: "F. M. Last", members bold, * equal
#   {{ entry | pub_members }}  space-separated slugs of matching people
#   {{ text | bib_text }}      strips BibTeX braces and escapes for display

require "bibtex"

module GroupPeople
  def self.fold(s)
    s.to_s.unicode_normalize(:nfkd).gsub(/\p{Mn}/, "").downcase
  end

  def self.split_name(name)
    last, first = name.to_s.split(",", 2).map { |x| x.to_s.strip }
    [last, first.to_s]
  end

  def self.people(site)
    coll = site.collections["people"]
    return [] unless coll
    coll.docs.map do |doc|
      words = doc.data["name"].to_s.gsub(/\(.*?\)/, "").split
      {
        "slug" => doc.basename_without_ext,
        "url" => doc.url,
        "last" => (doc.data["bib_last"] || words.last).to_s,
        "initial" => (doc.data["bib_initial"] || words.first.to_s[0]).to_s,
        "since" => doc.data["since"].to_i,
        "doc" => doc,
      }
    end
  end

  def self.matches?(person, author_name, year)
    last, first = split_name(author_name)
    fold(last) == fold(person["last"]) &&
      fold(first).start_with?(fold(person["initial"])) &&
      year.to_i >= person["since"]
  end

  def self.initials(first)
    first.split(/\s+/).map do |part|
      part.split("-").map { |p| p.end_with?(".") || p.length <= 1 ? p.sub(/\.?\z/, ".") : p[0] + "." }.join("-")
    end.join(" ")
  end

  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      path = File.join(site.source, "assets", site.config.dig("scholar", "bibliography") || "ref.bib")
      bib = File.exist?(path) ? BibTeX.open(path, filter: :latex) : []
      entries = bib.respond_to?(:data) ? bib.data.select { |e| e.respond_to?(:author) && e.has_field?(:author) } : []
      people = GroupPeople.people(site)
      site.config["group_people"] = people.map { |p| p.reject { |k, _| k == "doc" } }
      skip = Array(site.config.dig("scholar", "bibtex_skip_fields")).map(&:to_sym)
      raw = File.exist?(path) ? BibTeX.open(path) : nil
      clean = lambda do |list|
        list.map do |e|
          copy = raw[e.key].dup
          skip.each { |f| copy.delete(f) }
          copy.to_s
        end.join("\n")
      end
      site.pages << bib_page(site, "publications.bib", clean.call(entries)) if raw
      people.each do |p|
        mine = entries.select do |e|
          e[:author].to_s.split(" and ").any? { |a| GroupPeople.matches?(p, a, e[:year]) }
        end
        count = mine.size
        site.pages << bib_page(site, "team/#{p['slug']}/publications.bib", clean.call(mine)) if raw && count > 0
        p["doc"].data["pub_count"] = count
        # Sort key for the Publications member menu: most papers first, then team order.
        p["doc"].data["pub_rank"] = format("%05d-%05d", 99999 - count, (p["doc"].data["order"] || 99999).to_i)
        # The same rule as a bibtex-ruby query: a comma would split the query,
        # so "." stands in for the comma after the surname.
        p["doc"].data["pub_query"] = "(^| )#{Regexp.escape(p['last'])}. #{Regexp.escape(p['initial'])}"
      end
    end

    def bib_page(site, path, content)
      # A .txt source name keeps jekyll-scholar's BibTeX converter from turning
      # the file into HTML; the permalink still serves it as .bib.
      page = Jekyll::PageWithoutAFile.new(site, site.source, File.dirname(path), File.basename(path, ".bib") + ".txt")
      page.content = content
      page.data["layout"] = nil
      page.data["permalink"] = "/#{path}"
      page.data["render_with_liquid"] = false
      page.data["sitemap"] = false
      page
    end
  end

  module Filters
    def bib_text(input)
      s = input.to_s.dup
      s.gsub!(/\\([&%$#_{}])/, '\1')
      s.gsub!(/[{}]/, "")
      s.gsub!("--", "–")
      s.strip
    end

    def pub_authors(entry)
      site = @context.registers[:site]
      people = site.config["group_people"] || []
      equal = entry["equal"].to_s.split(/[;,]/).map { |x| GroupPeople.fold(x.strip) }.reject(&:empty?)
      year = entry["year"]
      entry["author"].to_s.split(" and ").map do |a|
        last, first = GroupPeople.split_name(bib_text(a))
        shown = first.empty? ? last : "#{GroupPeople.initials(first)} #{last}"
        shown += "*" if equal.include?(GroupPeople.fold(last))
        member = people.find { |p| GroupPeople.matches?(p, "#{last}, #{first}", year) }
        member ? %(<a class="pub-member" href="#{site.baseurl}#{member['url']}">#{shown}</a>) : shown
      end.join(", ")
    end

    def pub_members(entry)
      people = @context.registers[:site].config["group_people"] || []
      names = entry["author"].to_s.split(" and ").map { |a| bib_text(a) }
      people.select { |p| names.any? { |a| GroupPeople.matches?(p, a, entry["year"]) } }
            .map { |p| p["slug"] }.join(" ")
    end
  end
end

Liquid::Template.register_filter(GroupPeople::Filters)
