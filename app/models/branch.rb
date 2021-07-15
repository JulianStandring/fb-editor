class Branch
  include ActiveModel::Model
  attr_accessor :previous_flow_object, :service

  def previous_flow_uuid
    previous_flow_object.uuid
  end

  def pages
    service.pages.map { |page| [page.title, page.uuid] }
  end

  def previous_questions
  end
end
