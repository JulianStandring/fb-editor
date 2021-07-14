class Branch
  include ActiveModel::Model
  attr_accessor :previous_flow_object

  def previous_flow_uuid
    previous_flow_object.uuid
  end
end
