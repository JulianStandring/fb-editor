class Branch
  include ActiveModel::Model
  attr_accessor :previous_flow_object, :service, :default_next

  def conditionals
    @conditionals ||= []
  end

  def conditionals_attributes=(hash)
    hash
  end

  def previous_flow_uuid
    previous_flow_object.uuid
  end

  def pages
    service.pages.map { |page| [page.title, page.uuid] }
  end

  def previous_questions
    results = previous_pages.map do |page|
      components = Array(page.components).select(&:supports_branching?)

      components.map do |component|
        [component.humanised_title, component.uuid]
      end
    end

    results.flatten(1)
  end

  def previous_flow_title
    previous_flow_object.title
  end

  def previous_pages
    MetadataPresenter::TraversedPages.new(
      service,
      {},
      previous_flow_object
    ).all.push(previous_flow_object)
  end
end
